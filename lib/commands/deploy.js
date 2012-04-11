var async = require('async'),
	path = require('path'),
	exec = require('child_process').exec,
	Android = require('../platform/android'),
	validate = require('../support/validate'),
	constants = require('../support/constants'),
	config = require('../support/config'),
	tisdk = require('../support/tisdk'),
	logger,
	userConf,
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
		['-r, --noRun', 'Don\'t run the app after deployment'],
		['-s, --sdk <sdk>', 'Titanium SDK version'],
		['-w, --webroot <webroot>', 'Deploy mobileweb apps to this local webroot']
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
		if (!tisdk.exists(options.sdk)) {
            cmdCallback('Titanium SDK version "' + options.sdk + '" not found');
            return;
        }
		config.getTiappXml(path.join(options.path,'tiapp.xml'), function(tiapp) {
			options.sdk = options.sdk || tiapp['sdk-version'] || tisdk.getMaxVersion();

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
						
						logger.debug('Starting ' + target + ' deploy');
						instance.titanium.deploy(options, tiapp, function(err) {
							callback();
						});
					} catch (e) {
						logger.error(target + ' deploy failed');
						logger.error(e);
						callback();
					}
				});
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