var async = require('async'),
	path = require('path'),
	exec = require('child_process').exec,
	Android = require('../support/android'),
	validate = require('../support/validate'),
	constants = require('../support/constants'),
	config = require('../support/config'),
	tisdk = require('../support/tisdk'),
	logger,
	options,
	cmdCallback;

exports.doc = {
	command: 'titanium deploy', 
	description: 'Deploy the application to a device for testing', 
	usage: 'titanium deploy [ios,android] [OPTIONS]',
	options: [
		['-a, --androidSerial', 'Serial number of the Android device to which you\'d like to deploy'],
		['-n, --nobuild', 'Don\t rebuild the project, use existing binaries'],
		['-p, --path <path>', 'Project path to build - defaults to current working directory'],
		['-s, --sdk <sdk>', 'Titanium SDK version']
	],
	needsConfig: true
};

var deployAndroid = function(tiapp, deployCallback) {
	var buildPath = path.join(options.path, 'build', 'android'),
        apkPath = path.join(buildPath, 'bin', 'app.apk'),
        manifestPath = path.join(buildPath, 'AndroidManifest.xml'),
        android = new Android(userConf.androidSDKPath, logger, userConf.mobileSdkRoot),
        className = null,
        serial = null;

	logger.debug('Starting Android deploy of ' + tiapp.name);

	async.parallel([
		// build apk
		function(parallelCallback) {
			async.series([
				// build apk, if necessary
				function(callback) {
					if (options.nobuild) {
						callback(); 
					} else {
						logger.debug('Building app.apk for ' + tiapp.name);
						android.titanium.build(options.sdk, tiapp.name, options.path, tiapp.id, function(err) {
							callback(err);
						});
					}
				},
				// get the app's classname
				function(callback) {
					logger.debug('Finding AndroidManifest.xml class name for ' + tiapp.name);
					android.getClassNameFromManifest(manifestPath, function(err, _className) {
	                    className = _className;
	                    if (className !== null) {
	                        logger.debug('Found ' + tiapp.name + ' class name: ' + className);
	                    }
	                    callback();
	                });
				}
			],
			function(err, result) {
				parallelCallback(err);	
			});
		},
		// Find the connected device
		function(parallelCallback) {
			logger.debug('Finding connected Android devices');
			android.adb.devices(function(err, devices) {
				if (err) {
					parallelCallback(err);
					return;
				}
				for (var i = 0; i < devices.length; i++) {
					var device = devices[i];
					if (device.type === 'device' &&
						(!options.androidSerial || options.androidSerial === device.serial)) {
						serial = device.serial;
						logger.debug('Android device found: (' + serial + ')');
						break;
					}
				}
				if (serial === null) {
					err = 'Unable to find any connected Android devices';
				}
				parallelCallback(err);
			});
		}
	], 
	function(err, result) {
		// built apk and found device, now install and run apk
		if (err) { 
			deployCallback(err);
			return;
		}

		async.series([
			// deploy app.apk to device 
			function(callback) {
				logger.debug('Installing ' + tiapp.name + ' to ' + serial);
				android.adb.installApp(apkPath, serial, function(err) {
					if (!err) { logger.debug('Application ' + tiapp.name + ' successfully installed to ' + serial); }
					callback(err);
				});
			},
			// run app on device
			function(callback) {
				if (className) {
					android.adb.runApp(serial, tiapp.id, className, function(err) {
						if (!err) { logger.debug('Application ' + tiapp.name + ' should now be running on your Android device'); }
						callback(err);
					});
				} else {
					logger.info('Application installed. You can now run it from the device.');
					callback();
				}
			}
		],
		function(err, result) {
			deployCallback(err);
		});
	});
};

//execute the command - will be passed the global configuration 
//object and the command line arguments passed in
exports.execute = function(args, _options, _logger, _cmdCallback) {
	options = _options;
	logger = _logger;
	cmdCallback = _cmdCallback || logger.die;
	userConf = config.getUserConfig(false);
	
	try {
		// Validate project path
		options.path = validate.projectPath(options.path || process.cwd());
		options.sdk = options.sdk || tisdk.getMaxVersion();
		if (!tisdk.exists(options.sdk)) {
            cmdCallback('Titanium SDK version "' + options.sdk + '" not found');
            return;
        }
		config.getTiappXml(path.join(options.path,'tiapp.xml'), function(tiapp) {
			// Make sure all build targets are valid
			var targets = validate.platformTargets(
				args[0] ? args[0].split(',') : [], 
				constants.RUN_TARGETS[process.platform],
				tiapp
			); 
			var functions = [];

			// Create array of functions for the builds
			targets.forEach(function(target) {
				switch (target) {
					case 'android':
						functions.push(function(callback) {
							deployAndroid(tiapp, function(err) {
								if (err) { logger.error(err); }
								callback();
							});
						});
						break;
					default:
						logger.error('Deploy target "' + target + '" is not yet supported.');
						break;
				}
			});

			// Execute the builds in parallel
			async.parallel(functions, function(err, result) {
				logger.debug('Finished with all deployments');
				cmdCallback(err);
			});
		});
	} catch (e) {
		cmdCallback(e);
	}
};