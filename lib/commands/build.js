var async = require('async'),
	path = require('path'),
	exec = require('child_process').exec,
	Android = require('../support/android'),
	validate = require('../support/validate'),
	constants = require('../support/constants'),
	config = require('../support/config'),
	tisdk = require('../support/tisdk'),
	userConf,
	options,
	logger,
	cmdCallback;

exports.doc = {
	command: 'titanium build', 
	description: 'Build the application binary', 
	usage: 'titanium build [ios,android] [OPTIONS]',
	options: [
		['-p, --path <path>', 'Project path to build - defaults to current working directory'],
		['-s, --sdk <sdk>', 'Titanium SDK version']
	],
	needsConfig: true
};

var buildAndroid = function(tiapp, callback) {
	try {
		var android = new Android(userConf.androidSDKPath, logger, userConf.mobileSdkRoot);
		logger.debug('Starting Android build for ' + tiapp.name);
		android.titanium.build(options.sdk, tiapp.name, options.path, tiapp.id, function(err) {
			if (err) {
				logger.error(err);
				logger.error('Failed to build app.apk for ' + tiapp.name);
			} else {
				logger.debug('app.apk built for ' + tiapp.name);
			}
			callback();
		});
	} catch (e) {
		logger.error(e);
		callback();
	}
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
							buildAndroid(tiapp, function(err) {
								if (err) { logger.error(err); }
								callback();
							});
						});
						break;
					default:
						logger.error('Build target "' + target + '" is not yet supported.');
						break;
				}
			});

			// Execute the builds in parallel
			async.parallel(functions, function(err, result) {
				logger.debug('Finished with all builds');
				cmdCallback(err);
			});
		});
	} catch (e) {
		cmdCallback(e);
	}
};