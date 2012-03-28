var constants = require('../support/constants'),
	config = require('../support/config'),
	exec = require('child_process').exec,
	fs = require('fs'),
	path = require('path'),
	pc = require('path-complete'),
	prompt = require('prompt'),
	async = require('async'),
	props = {},
	logger;

exports.doc = {
	command: 'titanium configure', 
	description: 'Configure your Titanium development environment', 
	usage: 'titanium configure [OPTIONS]',
	options: [
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
	//Check to see if the Titanium Mobile SDK files exist.
	fs.readdir(props.sdkRoot, function(err, files) {
		if (err) { logger.error(err); }
		
		if (files.length > 1) {
			logger.debug("Titanium SDK located: " + props.sdkRoot);
			getUserConfig();
		} else {
			logger.info('Downloading latest Titanium SDK ..');
			
			var opts = {url:'http://api.appcelerator.net/p/v1/release-download?token=W4vYRgf4'};
			http.get(opts, props.mobileSDKRoot + '/latest.zip', function (error, result) {
				if (error) {
					logger.error(error);
				} else {
					logger.info('Download complete.\nUnpacking SDK ...');
					var c = exec("unzip -u " + props.mobileSDKRoot + "/latest.zip", function(err, stdout, stderr) {
						if (err) { logger.error(err); }
						logger.info('SDK unpacked.');
						getUserConfig();
					});
				}
			});
			getUserConfig();
			//TODO: Still need to lock down the best way to locate the correct url for the latest sdk.
			//TODO: Need to see if there is a better method than http-get for fetching packages.
		}
	});
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
					if (fs.statSync(aPath).isDirectory()) {
						// TODO: validate in some way that this actually is an android sdk
						logger.debug('Android SDK Path: ' + aPath);
						props.androidSDKPath = aPath;
						mobileSDKLocator();
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
				logger.info('Found Developer path: ' + developerPath);

				var iosSdkPath = path.join(props.developerPath, constants.IOS_SDK_PATH);
				if (!path.existsSync(iosSdkPath)) {
					callback('Could not find iOS SDK folder at "' + iosSdkPath + '". You will not be able to build iOS apps');
				}
				logger.info('Found iOS SDK path: ' + iosSdkPath);		

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
exports.execute = function(args, options, _logger) {
	var os = process.platform;
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
