var path = require('path'),
	exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	async = require('async'),
	validate = require('../support/validate'),
	logger,
	__self;

var MINIMUM_IOS_SDK_VERSION = 4.0;

// 'simulator' will do a 'build' is necessary
var JUST_USE_SIMULATOR = true;

//############## MODULE INTERFACE ################//
function Ios(options) {
	__self = this;
	logger = options.logger;

	this.iosTarget = options.iosTarget;
	this.paths = {
		titanium: options.titaniumPath
	}

	this.titanium = {
		build: titaniumBuild,
		deploy: titaniumDeploy,
		run: titaniumRun
	}

	this.getSdks = getSdks;
};
module.exports = Ios;

var titaniumBuild = function(options, tiapp, buildCallback) {
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
				if (options.nobuild || JUST_USE_SIMULATOR) {
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
				exec('"' + builderPath + '" ' + args.join(' '), function(err, stdout, stderr) {
					if (err) {
						logger.error(stdout);
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
				titaniumBuild(options, tiapp, callback);
			},
			// run ios project on simulator
			function(callback) {
				var args = [
					'simulator',
					options.iosVersion,
					'"' + options.path + '"',
					tiapp.id,
					tiapp.name,
					__self.iosTarget
				];
				logger.debug('Loading app into simulator');
	            var buildIos = spawn(builderPath, args);
	            var buildError = '';
	            buildIos.stdout.on('data', function(data) {
	                if (('' + data).toLowerCase().indexOf('application started') !== -1) {
	                    buildIos.emit('exit');
	                }
	            });
	            buildIos.stderr.on('data', function(data) { 
	                buildError += data; 
	            });
	            buildIos.on('exit', function(data) { 
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
    exec('"' + prereqPath + '" project', function(err, stdout, stderr) {
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