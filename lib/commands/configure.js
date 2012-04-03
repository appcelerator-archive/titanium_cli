var constants = require('../support/constants'),
	config = require('../support/config'),
	update = require('./update'),
	exec = require('child_process').exec,
	fs = require('fs'),
	path = require('path'),
	pc = require('path-complete'),
	prompt = require('prompt'),
	async = require('async'),
	props = {},
	options,
	logger;

exports.doc = {
	command: 'titanium configure', 
	description: 'Configure your Titanium development environment', 
	usage: 'titanium configure [OPTIONS]',
	options: [
		['-f, --force', 'Download and install the latest Titanium SDK even if you already have it'],
		['-n, --noupdate', 'Don\'t download or install Titanium SDK(s)'],
		['-v, --verbose', 'Verbose logging output']
	]
};

function getUserConfig() {
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


	prompt.get(properties, function(err, result) {
		for (var k in result) {
			props[k] = result[k];
		}
		logger.debug(JSON.stringify(props));
		fs.writeFile(path.join(props.sdkRoot,constants.TITANIUM_CONFIG_FILE), JSON.stringify(props), function(err) {
			if (err) { logger.error(err); }
			logger.debug('Saved CLI configuration');
		});
	});

};

function mobileSDKLocator() {
	if (!options.noupdate) {
		// Make sure the latest Titanium SDK is installed
		update.execute([], { force: options.force }, logger, function(err) {
			if (err) { 
				logger.error('update: Failed to install Titanium SDK');
				logger.error(err);
			}
			getUserConfig();
		});
	} else {
		getUserConfig();
	}
}

function androidSDKLocator() {
	prompt.start();
	prompt.get([{
			message:"Would you like to setup for Android development? [y/N]",
			name:"doAndroid"}], function(err, result) {
		if (err) { logger.error(err); }
		
		if (/y/i.test(result.doAndroid)) {

			// TODO: Ask if they already have it installed. If yes, find it. If no,
			//       point them to the Android SDK download page
			process.stdout.write('Android SDK Path: ');
			pc.getPathFromStdin((props.androidSDKPath || ''), function(aPath) {
				try {
					if (fs.statSync(aPath).isDirectory() && 
						path.existsSync(path.join(aPath, 'platform-tools', 'adb'))
					   ) {
						logger.debug('Android SDK Path: ' + aPath);
						props.androidSDKPath = aPath;
						mobileSDKLocator();
					} else {
						throw 'not found';
					}
				} catch (e) {
					logger.error('Android SDK not found at "' + aPath + '"');
					androidSDKLocator(); 
				}
			});
		} else {
			mobileSDKLocator();
		}
	});
}

function iOSSDKLocator() {
	logger.debug('Locating iOS SDKs ... ');
	
	async.waterfall(
		[
			// ask xcode-select for the developer path
			function(callback) {
				exec("xcode-select -print-path", function(err, stdout, stderr) {
					callback(err, stdout.replace('\n', ''));
				});
			},
			// validate the ios developer path
			function(developerPath, callback) {
				if (!path.existsSync(developerPath)) {
					callback('Could not find XCode Developer folder at "' + developerPath + '". You will not be able to build iOS apps');
				}
				props.developerPath = developerPath;
				logger.debug('Found Developer path: ' + developerPath);

				var iosSdkPath = path.join(props.developerPath, constants.IOS_SDK_PATH);
				if (!path.existsSync(iosSdkPath)) {
					callback('Could not find iOS SDK folder at "' + iosSdkPath + '". You will not be able to build iOS apps');
				}
				logger.debug('Found iOS SDK path: ' + iosSdkPath);		
				logger.info('iOS SDK(s) found');

				// TODO: check ios sdk versions with: 
				//       exec("xcodebuild -showsdks", func(err, stdout, stderr));

				callback();		
			}
		],
		function(err, result) {
			if (err) { logger.warn(err); }
			androidSDKLocator(); 
		}
	);
}

//execute the command - will be passed the global configuration 
//object and the command line arguments passed in
exports.execute = function(args, _options, _logger) {
	var os = process.platform;
	options = _options;
	logger = _logger;
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

	// start locating SDKs
	if (os === 'darwin') {
		iOSSDKLocator();
	} else {
		androidSDKLocator();
	}
};
