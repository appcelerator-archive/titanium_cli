var path = require('path'),
	exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	async = require('async'),
	validate = require('../support/validate'),
	constants = require('../support/constants'),
	logger,
	__self;

var MINIMUM_IOS_SDK_VERSION = 4.0;
var DEFAULT_TARGET = 'iphone';

//############## MODULE INTERFACE ################//
function Ios(options) {
	__self = this;
	logger = options.logger;

	this.iosTarget = options.iosTarget || DEFAULT_TARGET;
	this.paths = {
		titanium: options.titaniumPath
	}

	this.titanium = {
		build: titaniumBuild,
		configure: titaniumConfigure,
		deploy: titaniumDeploy,
		run: titaniumRun
	}

	this.getSdks = getSdks;
};
module.exports = Ios;

//############## PRIVATE FUNCTIONS ######################//
var titaniumConfigure = function(options, props, configureCallback) {
	var cmd = 'xcode-select -print-path',
		iosDeveloperPath,
		iosSdkPath;

	// Make sure we are on Mac OSX
	if (process.platform !== 'darwin') {
		logger.debug('iOS is not supported on this operating system');
		configureCallback(); 
		return;
	}

	// Find Xcode and iOS SDK(s)
	logger.debug('Locating Xcode with `' + cmd + '`');
	exec(cmd, function(err, stdout, stderr) {
		// Find Xcode path
		iosDeveloperPath = stdout.replace('\n', '');
		if (err) {
			logger.error(stderr);
			logger.error('Error executing `' + cmd +'`');
			logger.error('Make sure you have Xcode and the iOS SDK installed and try again');
		} else if (!path.existsSync(iosDeveloperPath)) {
			logger.error('Could not find XCode Developer path at "' + iosDeveloperPath + '"');
			err = true;
		} else {
			logger.debug('Found Xcode Developer path at "' + iosDeveloperPath + '"');

			// Find iOS SDK path
			iosSdkPath = path.join(iosDeveloperPath, constants.IOS_SDK_PATH);
			if (!path.existsSync(iosSdkPath)) {
				logger.error('Could not find iOS SDK path at "' + iosSdkPath + '"');
				err = true;
			} else {
				logger.debug('Found iOS SDK path at "' + iosSdkPath + '"');
			}
		}
		
		if (err) {
			logger.error('iOS configuration completed with errors');
		} else {
			logger.debug('iOS configuration completed successfully');
		}

		// update the configuration properties
		props.iosDeveloperPath = iosDeveloperPath;
		props.iosSdkPath = iosSdkPath;
		configureCallback(err);
	});
};

var titaniumBuild = function(options, tiapp, buildCallback, fromSim) {
	var builderPath = path.join(__self.paths.titanium, options.sdk, 'iphone', 'builder.py'),
		sdks;

	try {
		async.series([
			// Find available SDKs
			function(callback) {
				logger.debug('Searching for available iOS SDKs');
				getSdks(options.sdk, function(err, _sdks) {
					if (err) {
						callback(err);
					} else {
						sdks = _sdks;

						// Make sure the chosen SDK is installed
						if (!sdks || !sdks.length) {
							callback('No iOS SDKs found');
							return;
			            } else if (options.iosVersion) {
			                validate.contains(options.iosVersion, sdks, function(val) {
			                    callback('iOS SDK "' + options.iosVersion + '" not installed. You have the following version installed: [' + sdks.join(',') + ']');
			                });
			            } else {
			                options.iosVersion = sdks[0];
			            }

						callback();
					}
				});
			},
			// build iOS app
			function(callback) {
				if (options.nobuild || fromSim) {
					callback();
					return;
				}

				logger.debug('Building iOS project ' + tiapp.name);
				var args = [
					'build',
					options.iosVersion,
					'"' + options.path + '"',
					tiapp.id,
					tiapp.name,
					__self.iosTarget
				];
				exec(constants.PYTHON + ' "' + builderPath + '" ' + args.join(' '), function(err, stdout, stderr) {
					if (err) {
						logger.error(stdout || stderr);
					}
					callback(err);
				});
			}
		], 
		function(err, result) {
			buildCallback(err);
		});
	} catch (e) {
		logger.error(e);
		buildCallback(e);
	}
};

var titaniumDeploy = function(options, tiapp, callback) {
	logger.warn('deploy not yet implemented for ' + __self.iosTarget);
	callback();
};

var titaniumRun = function(options, tiapp, runCallback) {
	var builderPath = path.join(__self.paths.titanium, options.sdk, 'iphone', 'builder.py');

	try {
		// build and run
		async.series([
			// build ios project, if necessary
			function(callback) {
				titaniumBuild(options, tiapp, callback, true);
			},
			// run ios project on simulator
			function(callback) {
				var args = [
					builderPath,
					'simulator',
					options.iosVersion,
					'"' + options.path + '"',
					tiapp.id,
					tiapp.name,
					__self.iosTarget
				];
				logger.debug('Loading app into simulator');
	            var buildIos = spawn(constants.PYTHON, args);
	            var buildError = '';
	            buildIos.stdout.on('data', function(data) {
	            	if (/\[ERROR\]/.test(data + '')) {
	            		logger.error(data + '');
	            	}
	                if (('' + data).toLowerCase().indexOf('application started') !== -1) {
	                    buildIos.emit('exit');
	                }
	            });
	            buildIos.stderr.on('data', function(data) { 
	                buildError += data; 
	            });
	            buildIos.once('exit', function(data) { 
	                if (buildError !== '') {
	                    callback(buildError);
	                } else {
	                    callback();
	                } 
	            });
			}
		],
		function(err, result) {
			if (err) { logger.error(err); }
			runCallback(err);
		});
	} catch (e) {
		logger.error(e);
		runCallback(e);
	}
};

var getSdks = function(sdkVersion, callback) {
	var iphoneRootPath = path.join(__self.paths.titanium, sdkVersion, 'iphone'),
        prereqPath = path.join(iphoneRootPath, 'prereq.py'),
        sdks,
        foundGoodSdk = false;

	logger.debug('Checking iOS build prerequisites');
    exec(constants.PYTHON + ' "' + prereqPath + '" project', function(err, stdout, stderr) {
        if (!err) {
            try {
                sdks = JSON.parse(stdout).sdks;
                logger.debug('Available iOS SDKs');
                logger.debug(sdks);
                for (var i = 0; i < sdks.length; i++) {
                	if (parseFloat(MINIMUM_IOS_SDK_VERSION) <= parseFloat(sdks[i])) {
                		foundGoodSdk = true;
                	}
                }
                if (!foundGoodSdk) {
                	err = 'No iOS SDKs are greater than or equal to the minimum SDK version ' + MINIMUM_IOS_SDK_VERSION;
                }
            } catch (e) {
                err = e;
            }
        }
        callback(err, sdks);
    });
};