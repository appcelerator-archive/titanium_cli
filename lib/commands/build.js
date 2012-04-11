var async = require('async'),
	path = require('path'),
	exec = require('child_process').exec,
	Android = require('../platform/android'),
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
				var moduleOptions = {
					logger: logger,
					titaniumPath: userConf.mobileSdkRoot,
					androidPath: userConf.androidSDKPath,
					iosTarget: target
				}
				var moduleTarget = target === 'iphone' || target === 'ipad' || target === 'retina' ? 'ios' : target;
				functions.push(function(callback) {
					try {
						var platformModule = require('../platform/' + moduleTarget);
						var instance = new platformModule(moduleOptions);
						
						logger.debug('Starting ' + target + ' build');
						instance.titanium.build(options, tiapp, function(err) {
							callback();
						});
					} catch (e) {
						logger.error(target + ' build failed');
						logger.error(e);
						callback();
					}
				});
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