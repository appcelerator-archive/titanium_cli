var support = require('../support'),
	consta = require('../support/constants'),
	config = require('../support/config'),
	exec = require('child_process').exec,
	fs = require('fs'),
	path = require('path'),
	prompt = require('prompt'),
	platform = process.platform,
	home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
	props = {},
	child;

exports.doc = {
	command: 'titanium configure', 
	description: 'Configure your Titanium development environment', 
	usage: 'titanium configure',
	options: [
		['-v, --verbose', 'Verbose logging output']
	]
};

function getUserConfig() {
	var json = fs.readFileSync(props.sdkRoot + 'cli.json', 'ascii'),
		config = JSON.parse(json);
		
	if (config) {
		for (var k in config) {
			if (k === 'appIdPrefix' || k === 'appPublisher' || k === 'appPublisherURL' || k === 'appCopyright') {
				props[k] = config[k];
			}
		}
	}
	
	var properties = [{
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
		support.debug(JSON.stringify(props));
		fs.writeFile(props.sdkRoot + 'cli.json', JSON.stringify(props), function(err) {
			if (err) { support.error(err); }
			support.debug('Saved CLI configuration');
		});
	});

};

function mobileSDKLocator() {
	//Check to see if the Titanium Mobile SDK files exist.
	var opts, 
		child,
		handleSDKRoot = function(err, files) {
			if (err) { support.error(err); }
			
			if (files.length > 1) {
				support.debug("Titanium SDK located!");
				getUserConfig();
			} else {
				support.info('Downloading latest Titanium SDK ..');
				
				var opts = {url:'http://api.appcelerator.net/p/v1/release-download?token=W4vYRgf4'};
				http.get(opts, props.mobileSDKRoot + '/latest.zip', function (error, result) {
					if (error) {
						support.error(error);
					} else {
						support.info('Download complete.\nUnpacking SDK ...');
						var c = exec("unzip -u " + props.mobileSDKRoot + "/latest.zip", function(err, stdout, stderr) {
							if (err) { support.error(err); }
							support.info('SDK unpacked.');
							getUserConfig();
						});
					}
				});
				getUserConfig();
				//TODO: Still need to lock down the best way to locate the correct url for the latest sdk.
				//TODO: Need to see if there is a better method than http-get for fetching packages.
			}
		};
		
	fs.readdir(props.sdkRoot, handleSDKRoot);
}

function androidSDKLocator() {
	prompt.start();
	prompt.get([{message:"Would you like to setup for Android development? [y/N]",
				 name:"doAndroid"}], function(err, result) {
		if (err) { support.error(err); }
		
		if (/y/i.test(result.doAndroid)) {
			prompt.get([{message:"Android SDK Path",
						 name:"androidSDKPath"}], function(err, result) {
				if (err) { support.error(err); }
				
				if (result.androidSDKPath) {
					fs.stat(result.androidSDKPath, function(err, stat) {
						if (err) { support.error(err); }
						
						if (stat.isDirectory()) {
							support.debug("Found Android SDK!");
							props.androidSDKPath = result.androidSDKPath;
							mobileSDKLocator();
						}
					});
				} else {
					support.debug('Android SDK not found at the given path, download the Android SDK at "XYZ" and rerun configure');
					mobileSDKLocator();
				}
			});
		} else {
			mobileSDKLocator();
		}
	});
}

function iOSSDKLocator() {
	support.debug('Locating iOS SDKs ... ');
	
	var developerPath, 
		sdkRoot,
		child, 
		subchild,
		handleSDKRoot = function(err, stat) {
			if (err) { support.error(err); }
			
			if (stat.isDirectory()) {
				support.debug("Found iOS SDK");
				androidSDKLocator();
			}
		},
		handleShowSDK = function(err, stdout, stderr) {
			if (err) { support.error(err); }
			
			sdkRoot = path.join(props.developerPath, 'Platforms/iPhoneSimulator.platform/Developer/SDKs');
			fs.stat(sdkRoot, handleSDKRoot);
		},
		handleDevPath = function(err, stat) {
			if (err) { support.error(err); }
		
			if (stat.isDirectory()) {
				props.developerPath = developerPath;
				support.debug('Found developer path!');
				subchild = exec("xcodebuild -showsdks", handleShowSDK);
			} else {
				support.warn('Could not detect a path to the Xcode folder');
			}
		},
		handlePrintPath = function(err, stdout, stderr) {
			if (err) { support.error(err); }
		
			developerPath = stdout.replace('\n','');
			fs.stat(developerPath, handleDevPath);
		};
		
	child = exec("xcode-select -print-path", handlePrintPath);
}

//execute the command - will be passed the global configuration 
//object and the command line arguments passed in
exports.execute = function(args, options, logger) {
	props.sdkRoot = config.getSdkRoot();
	if (platform === 'darwin') {
		props.mobileSdkRoot = path.join(props.sdkRoot, 'mobilesdk/osx');
		props.modulesDir = path.join(props.sdkRoot, 'modules');
	    iOSSDKLocator();
	}
	
	if (platform === 'linux') {
		props.sdkRoot = consta.SDK_ROOT_PATH_LINUX;
		props.mobileSdkRoot = path.join(props.sdkRoot, 'mobilesdk/linux');
		props.modulesDir = path.join(props.sdkRoot, 'modules');
	}
	
	if (platform === 'win32') {
		props.sdkRoot = consta.SDK_ROOT_PATH_WIN32;
		props.mobileSdkRoot = path.join(props.sdkRoot, 'mobilesdk\\win32');
		props.modulesDir = path.join(props.sdkRoot, 'modules');
	}


};

/*

#!/usr/bin/env node

var fs = require('fs'),
	ti = require('./commands'),
	p = require('commander'),
	path = require("path"),
	url = require('url'),
	http = require('http-get'),
	path = require('path'),
	exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	events = require('events'),
	consta = require('./constants'),
	cwd = process.cwd(),
	callback = function() {},
	child = null,
	props = {},
	platform = process.platform;
    
support.debug('Configuring Titanium CLI.');

function getRoot(url) {
	try
    {
        fs.statSync(url + '/tiapp.xml');
        return url;
    }
    catch (e)
    {
        if(url === '/') {
            support.error("No project found at this locations");
            process.exit();
        } else {
            return getRoot(path.normalize(url+'/..'));
        }
    }
}

function getUserConfig() {
	// This is just effin ridiculous!
	fs.readFile(props.sdkRoot + 'cli.json', function(err, data) {
		if (err) {
			props.projectRoot = getRoot(cwd);
			p.prompt('Application ID Prefix [com.youcompany]:', function(val) {
				props.appIdPrefix = val;

				p.prompt('Default Application Publisher [YourCompany, Inc.]:', function(val) {
					props.appPublisher = val;

					p.prompt('Default Publisher URL [yourcompany.com]:', function(val) {
						props.appPublisherURL = val;

						p.prompt('Default Copyright Message [2011 YourCompany, Inc.]:', function(val) {
							props.appCopyright = val;
							process.stdin.destroy();

							fs.writeFile(props.sdkRoot + 'cli.json', JSON.stringify(props), function(err) {
								if (err) throw err;
								support.debug('Saved CLI configuration');
								exports.props = props;
								callback();
							});
						});
					});
				});
			});
		} else {
			props = JSON.parse(data);
			props.projectRoot = getRoot(cwd);

			support.debug('CLI configuration loaded...');
			exports.props = props;
			callback();
		}
	});
}

function mobileSDKLocator() {
	//Check to see if the Titanium Mobile SDK files exist.
	fs.readdir(props.sdkRoot, function(err, files) {
		if (err) throw err;
		if (files.length > 1) {
			support.debug('Titanium SDK located!');
			getUserConfig();
		} else {
			// Download and install latest sdk
			support.info('Downloading latest Titanium SDK ..');

			// Need to add a check for the latest sdk. The api url has the latest sdk as 1.7.5?!?!
			var opts = {url:'http://api.appcelerator.net/p/v1/release-download?token=W4vYRgf4'};
			http.get(opts, './latest.zip', function (error, result) {
				if (error) {
					support.error(error);
				} else {
					support.info('Download complete.\nUnpacking SDK ...');
					var c = exec("unzip ./latest.zip", function(err, stdout, stderr) {
						if (err) throw err;
						support.info('SDK unpacked.');
						getUserConfig();
					});
				}
			});
		}
	});
}

function androidSDKLocator() {
	p.prompt('Would you like to setup Android development [Y]:', function(val) {
		if (val === 'Y' || val === '') {
			p.prompt('Path to Android SDK:', function(val) {
				if (val) {
					fs.stats(val, function(err, stats) {
						if (err) throw err;
						if (stats.isDirectory()) {
							props.androidSDKPath = val;
							mobileSDKLocator();
						}
					});
				} else {
					support.debug('Android SDK not found at the given path, download the Android SDK at "XYZ" and rerun configure');
					mobileSDKLocator();
				}
			});
		} else {
			mobileSDKLocator();
		}
	});
}

function iOSSDKLocator() {
	support.debug('Locating iOS SDKs ... ');

	//Check the path to Apple developer tools
	//TODO: Check path for commands, add if necessary
	child = exec("xcode-select -print-path", function(err, stdout, stderr) {
		if (err) throw err;

		var developerPath = stdout.replace('\n','');
		//stat the developer path to make sure its a directory
		fs.stat(developerPath, function(error, stats) {
			if (error) throw error;
			if (stats.isDirectory()) {
				props.developerPath = developerPath;
				support.debug('Found developer path!');

				//Make sure an iOS sdk exists
				var subchild = exec("xcodebuild -showsdks", function(err, stdout, stderr) {
					if (err) throw err;
					var sdkRoot = path.join(props.developerPath, 'Platforms/iPhoneSimulator.platform/Developer/SDKs');
					//stat the sdk path to make sure its a directory
					fs.stat(sdkRoot, function(error, stats) {
						if (error) throw error;
						if(stats.isDirectory()) {
							support.debug('Found iOS SDKs!');
							//everything is good to go, lets check for Titanium SDKs
							androidSDKLocator();
						}
					});
				});
			} else {
			    console.log('Could not detect a path to the Xcode folder');
			}
		});
	});
}



if (platform === 'darwin') {
	fs.stat(consta.SDK_ROOT_PATH_MACOSX, function(err, stat) {
		if(err === null) {
			props.sdkRoot = consta.SDK_ROOT_PATH_MACOSX;
		} else {
			props.sdkRoot = consta.SDK_ROOT_PATH_MACOSX_ALT;
		}
		props.mobileSdkRoot = path.join(props.sdkRoot, 'mobilesdk/osx');
		props.modulesDir = path.join(props.sdkRoot, 'modules');
    });
}

if (platform === 'linux') {
	props.sdkRoot = consta.SDK_ROOT_PATH_LINUX;
	props.mobileSdkRoot = path.join(props.sdkRoot, 'mobilesdk/linux');
	props.modulesDir = path.join(props.sdkRoot, 'modules');
}

if (platform === 'win32') {
	props.sdkRoot = consta.SDK_ROOT_PATH_WIN32;
	props.mobileSdkRoot = path.join(props.sdkRoot, 'mobilesdk\\win32');
	props.modulesDir = path.join(props.sdkRoot, 'modules');
}

 exports.propsLoaded = function(method) {
 	iOSSDKLocator();
 	callback = method;
 };

*/
