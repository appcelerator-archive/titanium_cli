var constants = require('../support/constants'),
	config = require('../support/config'),
	validate = require('../support/validate'),
	update = require('./update'),
	exec = require('child_process').exec,
	fs = require('fs'),
	path = require('path'),
	prompt = require('prompt'),
	async = require('async'),
	colors = require('colors'),
	props = {},
	options,
	logger,
	cmdCallback;

// TODO: find list of installed platforms (issue #103)
var PLATFORMS = ['ios', 'android', 'mobileweb'];

exports.doc = {
	command: 'titanium configure', 
	description: 'Configure your Titanium development environment', 
	usage: 'titanium configure [android,ios,mobileweb] [OPTIONS]',
	options: [
		['-f, --force', 'Download and install the latest Titanium SDK even if you already have it'],
		['-n, --noupdate', 'Don\'t download or install Titanium SDK(s)']
	],
	needsConfig: false
};

function writeUserConfig() {
	var properties = [
	{
		message:"App ID Prefix",
		name:"appIdPrefix",
		default:props.appIdPrefix || "com.yourcompany"
	},
	{
		message:"App Publisher",
		name:"appPublisher",
		default:props.appPublisher || "YourCompany, Inc."
	},
	{
		message:"Publisher URL",
		name:"appPublisherURL",
		default:props.appPublisherURL || "yourcompany.com"
	},
	{
		message:"Copyright Message",
		name:"appCopyright",
		default:props.appCopyright || "2012 YourCompany, Inc."
	}];

	prompt.start();
	prompt.get(properties, function(err, result) {
		for (var k in result) {
			props[k] = result[k];
		}
		logger.debug(JSON.stringify(props));

		var cliConf;
		try {
			cliConf = path.join(props.sdkRoot,constants.TITANIUM_CONFIG_FILE);
			logger.debug('Writing to "' + cliConf + '"');
			fs.writeFile(cliConf, JSON.stringify(props), function(err) {
				if (err) { 
					cmdCallback(err);
				} else {
					logger.info('Titanium has been configured!');
					cmdCallback();
				}
			});
		} catch (e) {
			logger.error('configure: Failed to write Titanium config file to "' + cliConf + '"');
			cmdCallback(e);
		}
	});
};

//execute the command - will be passed the global configuration 
//object and the command line arguments passed in
exports.execute = function(args, _options, _logger, _cmdCallback) {
	options = _options;
	logger = _logger;
	cmdCallback = _cmdCallback || process.exit;
	var functions = [],
		platforms = PLATFORMS;

	try {
		// Validate target platforms 
		if (args[0]) {
			platforms = args[0].split(',');
			validate.contains(platforms, PLATFORMS, function(val) {
				throw 'Invalid configure platform "' + val + '". Must be one or more of the following: [' + PLATFORMS.join(',') + ']';
			});
		}

		// Create function for titanium prerequisites
		functions.push(function(callback) {
			// check for JRE
			exec('java -version', function(err, stdout, stderr) {
				if (err) {
					logger.error(err);
					logger.error('titanium requires that the Java Runtime Environment is installed and is available on your PATH.');
					logger.error('You can download it here: ' + 'http://java.com/download/index.jsp'.white);
					logger.error('');
					logger.error('Please install the JRE and make sure it is in your PATH.');
					logger.error('To test, make sure the following command runs successfully:');
					logger.error('');
					logger.error('    java -version');
					logger.error('');
				}
				callback(err);
			});
		});

		// Create function for titanium level configuration
		functions.push(function(callback) {
			var os = process.platform;

			// Find OS specific paths
			props.sdkRoot = config.getSdkRoot();
			props.mobileSdkRoot = path.join(props.sdkRoot, constants.SDK_ROOT_SUFFIX[os]);
			props.modulesDir = path.join(props.sdkRoot, constants.SDK_ROOT_SUFFIX[os]);

			// Load existing Titanium CLI config file, if it exists
			var cliConf = config.getUserConfig(true);
			if (cliConf) {
				for (var k in cliConf) {				
					props[k] = cliConf[k];
				}
			}

			// Get the latest stable Titanium SDK and install
			logger.info('Downloading and installing latest Titanium SDK');
			update.execute([], { force: options.force }, logger, function(err) {
				if (err) { 
					logger.error('update: Failed to install Titanium SDK');
					logger.error(err);
				}
				callback();
			});
		});

		// Create functions for platform-specific configuration
		var moduleOptions = { 
			logger: logger,
			titaniumPath: props.mobileSdkRoot
		};
		platforms.forEach(function(platform) {
			functions.push(function(callback) {
				try {
					var platformModule = require('../platform/' + platform);
					var instance = new platformModule(moduleOptions);
					
					logger.info('Configuring ' + platform + '...');
					instance.titanium.configure(options, props, function(err) {
						callback();
					});
				} catch (e) {
					logger.error(platform + ' configure failed');
					logger.error(e);
					callback();
				}
			});
		});

		// Execute all the created configuration functions as a series
		async.series(functions, function(err, result) {
			if (err) {
				logger.error('Configuration ended in error.');
				cmdCallback(err);
			} else {
				writeUserConfig();
			}
		});
	} catch (e) {
		logger.error(e);
		cmdCallback(e);
	}
};
