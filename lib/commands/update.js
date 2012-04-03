// TODO: Get URL for pulling down latest release builds

var http = require('http'),
	async = require('async'),
	fs = require('fs'),
	path = require('path'),
	exec = require('child_process').exec,
	constants = require('../support/constants'),
	validate = require('../support/validate'),
	tisdk = require('../support/tisdk'),
	config = require('../support/config'),
	logger;

exports.doc = {
	command: 'titanium update', 
	description: 'Install the latest Titanium SDK update(s)', 
	usage: 'titanium update [OPTIONS]',
	options: [
		// ['-c, --ci', 'Get the latest continuous integration build as well'],
		['-f, --force', 'Download SDK even if you already have it'],
		['-v, --verbose', 'Verbose logging output']
	]
};

exports.execute = function(args, options, _logger, cmdCallback) {
	logger = _logger;
	cmdCallback = cmdCallback || logger.die;
	var sdkRoot = config.getSdkRoot(),
		listOptions = constants.UPDATE_SERVERS.CI.options,
		listUrl = listOptions.host + listOptions.path;
		os = process.platform,
		json = '',
		sdkVersion = null,
		sdkUrl = null,
		sdkFilename = null;

	// Validate the current platform
	validate.contains(os, constants.TITANIUM_PLATFORMS, function(val) {
		cmdCallback('Current OS "' + os + '" is not supported.');
		return;
	});

	async.series([
		// Get the Titanium SDK JSON listing
		function(callback) {
			logger.debug('Checking for Titanium SDK updates...');
			http.get(listOptions, function(res) {
				res.on('data', function(chunk) {
					json += chunk.toString('utf8', 0, chunk.length);
				}).on('end', function() {
					callback();
				});
			}).on('error', function(e) {
				logger.error('Failed to retrieve Titanium SDK listing from "' + listUrl + '"');
				callback(e);
			});
		}, 
		// Get the URL of the latest SDK
		function(callback) {
			try {
				var list = JSON.parse(json),
					osMap = constants.UPDATE_OS_MAP[os],
					regex = new RegExp('^mobilesdk\\-(.+)\\-' + osMap  + '\\.zip$', 'i'),
					matches;

				for (var i = list.length-1; i >= 0; i--) {
					var item = list[i];
					if (matches = item.filename.match(regex)) {
						// See if we already have this SDK
						sdkVersion = matches[1];
						if (tisdk.exists(sdkVersion) && !options.force) {
							logger.info('Latest Titanium SDK (' + sdkVersion + ') is already installed.');
							cmdCallback();
							return;
						}
						logger.debug('Latest Titanium SDK found: ' + sdkVersion);
						sdkUrl = item.filename;
						callback();
						return;
					}
				}
				callback('No Titanium SDK updates found for OS "' + osMap + '" at "' + listUrl + '"');
			} catch (e) {
				logger.error('Failed to parse Titanium SDK JSON listing');
				callback(e);
			}
		},
		// Download update
		function(callback) {
			try {
				sdkFilename = path.join(sdkRoot, sdkVersion + '-download.zip');
				if (path.existsSync(sdkFilename) && !options.force) {
					callback();
					return;
				}
				logger.info('Downloading Titanium SDK ' + sdkVersion);

				var downloadOptions = constants.UPDATE_SERVERS.CI.options;
				downloadOptions.path = constants.UPDATE_SERVERS.CI.rootPath + sdkUrl;

				http.get(downloadOptions, function(res) {
					var downloadFile = fs.createWriteStream(sdkFilename, {flags:'w'});
					var fileSize = res.headers['content-length'];
					var progress = 0;
					var percent = 0;

					process.stdout.write('Progress: 0%');
					res.on('data', function(chunk) {
						progress += chunk.length;
						percent = Math.floor(progress / fileSize * 100);
						downloadFile.write(chunk);
						process.stdout.write('\rProgress: ' + percent + '%');
					}).on('end', function() {
						downloadFile.end();
						console.log(' ');
						logger.debug('Downloaded Titanium SDK to "' + sdkFilename + '"');
						callback();
					});
				}).on('error', function(e) {
					callback('Failed to download SDK from "' + downloadOptions.host + downloadOptions.path + '"');
				});
			}catch (e) {
				logger.error('Failed to download Titanium SDK');
				callback(e);
			}
		},
		// Install the update
		function(callback) {
			try {
				logger.debug('Installing Titanium SDK ' + sdkVersion);
				// TODO: need to test this on windows
				exec('unzip -uoqq "' + sdkFilename + '" -d "' + sdkRoot + '"', function(err, stdout, stderr) {
					callback(err);
				});
			} catch (e) {
				logger.error('Failed to install Titanium SDK');
				callback(e);
			}
		},
		// cleanup
		function(callback) {
			try {
				logger.debug('Deleting update archive file "' + sdkFilename + '"');
				fs.unlinkSync(sdkFilename);
				callback();
			} catch (e) {
				logger.error('There was an error deleting the update file "' + sdkFilename + '"');
				callback(e);
			}
		}
	],
	function(err, result) {
		if (err) {
			cmdCallback(err);
		} else {
			logger.info('Downloaded and installed Titanium SDK ' + sdkVersion);
			cmdCallback();
		}
	});
};