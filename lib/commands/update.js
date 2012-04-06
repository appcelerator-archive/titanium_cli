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
		['-c, --ci', 'Get the latest continuous integration build as well'],
		['-f, --force', 'Download SDK even if you already have it']
	],
	needsConfig: true
};

var getSdkListing = function(httpOptions, callback) {
	var json = '';
	http.get(httpOptions, function(res) {
		res.on('data', function(chunk) {
			json += chunk.toString('utf8', 0, chunk.length);
		}).on('end', function() {
			callback(null, json);
		});
	}).on('error', function(e) {
		logger.error('Failed to retrieve Titanium SDK listing from "' + httpOptions.host + httpOptions.path + '"');
		callback(e);
	});
};

var getLatestSdkFromListing = function(sdkType, json, callback) {
	try {
		var list = JSON.parse(json),
			osMap = constants.UPDATE_OS_MAP[process.platform],
			regex = new RegExp('^mobilesdk\\-(.+)\\-' + osMap  + '\\.zip$', 'i'),
			i, matches;

		if (sdkType === 'CI') {
			for (i = list.length-1; i >= 0; i--) {
				var item = list[i];
				if (matches = item.filename.match(regex)) {
					callback(null, {
						version: matches[1],
						path: constants.UPDATE_SERVERS.CI.rootPath + item.filename,
						host: constants.UPDATE_SERVERS.CI.options.host
					});
					return;
				}
			}
		} else if (sdkType === 'RELEASE') {
			for (i = 0; i < list.releases.length; i++) {
				if (list.releases[i].os === osMap &&
					(matches = list.releases[i].url.replace('http://', '').match(/^([^\/]+)(\/.+)/))) {
					callback(null, { 
						version: list.releases[i].version,
						path: matches[2],
						host: matches[1]
					});
					return;
				}
			}
		} else {
			callback('Unsupported SDK type "' + sdkType + '"');
		}
		callback('No Titanium ' + sdkType + ' SDK updates found for OS "' + osMap + '"');
	} catch (e) {
		logger.error('Failed to parse Titanium SDK JSON listing');
		callback(e);
	}
};

exports.execute = function(args, options, _logger, cmdCallback) {
	logger = _logger;
	cmdCallback = cmdCallback || logger.die;
	var sdkRoot = config.getSdkRoot(),
		buildList = options.ci ? ['RELEASE','CI'] : ['RELEASE'];

	// Validate the current platform
	validate.contains(process.platform, constants.TITANIUM_PLATFORMS, function(val) {
		cmdCallback('Current OS "' + process.platform + '" is not supported.');
		return;
	});

	// need to use an async.parallel here
	buildList.forEach(function(sdkType) {
		async.waterfall([
			// Get the Titanium SDK JSON listing
			function(callback) {
				logger.debug('Checking for Titanium SDK updates');
				getSdkListing(constants.UPDATE_SERVERS[sdkType].options, function(err, json) {
					callback(err, json);
				});
			}, 
			// Get the URL and version of the latest SDK
			function(json, callback) {
				logger.debug('Finding latest available version of Titanium SDK in update listing');
				getLatestSdkFromListing(sdkType, json, function(err, data) {
					if (err) { callback(err); return; }
					if (tisdk.exists(data.version) && !options.force) {
						logger.info('Latest Titanium SDK (' + data.version + ') is already installed.');
						
						// TODO: need to make sure already having a release sdk doesn't
						//       short circuit a CI SDK download and install
						cmdCallback();
						return;
					} 
					callback(err, data);
				});
			},
			// Download update
			function(sdkData, callback) {
				try {
					sdkData.filename = path.join(sdkRoot, sdkData.version + '-download.zip');
					if (path.existsSync(sdkData.filename) && !options.force) {
						callback(null, sdkData);
						return;
					}
					logger.info('Downloading Titanium SDK ' + sdkData.version);

					var downloadOptions = {
						host: sdkData.host,
						port: 80,
						path: sdkData.path
					}

					var downloadFile = function(res) {
						var downloadFile = fs.createWriteStream(sdkData.filename, {flags:'w'});
						var fileSize = res.headers['content-length'];
						var progress = 0;
						var percent = 0;

						process.stdout.write('Progress: 0%');
						res.on('data', function(chunk) {
							progress += chunk.length;
							percent = Math.floor(progress / fileSize * 100);
							downloadFile.write(chunk);
							process.stdout.write('\r[INFO]  Download Progress: ' + percent + '%');
						}).on('end', function() {
							downloadFile.end();
							console.log(' ');
							logger.debug('Downloaded Titanium SDK to "' + sdkData.filename + '"');
							callback(null, sdkData);
						});
					};
console.log(downloadOptions);
					http.get(downloadOptions, function(response) {
						if (response.statusCode === 302) {
							var pieces = response.headers.location.replace('http://', '').match(/^([^\/]+)(\/.+)/);
							http.get({host:pieces[1], path:pieces[2]}, function(response2) {
								downloadFile(response2);
							}).on('error', function(e) {
								callback('Failed to download SDK from "' + downloadOptions.host + downloadOptions.path + '"');
							});
						} else {
							downloadFile(response);
						}
					}).on('error', function(e) {
						callback('Failed to download SDK from "' + downloadOptions.host + downloadOptions.path + '"');
					});
				} catch (e) {
					logger.error('Failed to download Titanium SDK');
					callback(e);
				}
			},
			// Install the update
			function(sdkData, callback) {
				try {
					logger.debug('Installing Titanium SDK ' + sdkData.version);
					// TODO: need to test this on windows
					exec('unzip -uoqq "' + sdkData.filename + '" -d "' + sdkRoot + '"', function(err, stdout, stderr) {
						callback(err, sdkData);
					});
				} catch (e) {
					logger.error('Failed to install Titanium SDK');
					callback(e);
				}
			},
			// cleanup
			function(sdkData, callback) {
				try {
					logger.debug('Deleting update archive file "' + sdkData.filename + '"');
					fs.unlinkSync(sdkData.filename);
					callback(null, sdkData);
				} catch (e) {
					logger.error('There was an error deleting the update file "' + sdkData.filename + '"');
					callback(e);
				}
			}
		],
		function(err, sdkData) {
			if (err) {
				cmdCallback(err);
			} else {
				logger.info('Downloaded and installed Titanium SDK ' + sdkData.version);
				cmdCallback();
			}
		});
	});
};