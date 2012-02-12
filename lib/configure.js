#!/usr/bin/env node

var fs = require('fs'),
	p = require('commander'),
	path = require('path'),
    exec = require('child_process').exec,
	consta = require('./constants'),
    child = null,
    props = {},
	platform = process.platform;

    console.log('Configuring Titanium CLI.');
    
function getUserConfig() {
	// This is just effin ridiculous!
	p.prompt('Application ID Prefix [com.youcompany]:', function(val) {
		props.appIdPrefix = val;
		
		p.prompt('Default Application Publisher [YourCompany, Inc.]:', function(val) {
			props.appPublisher = val;
			
			p.prompt('Default Publisher URL [yourcompany.com]:', function(val) {
				props.appPublisherURL = val;
				
				p.prompt('Default Copyright Message [2011 YourCompany, Inc.]:', function(val) {
					props.appCopyright = val;
					process.stdin.destroy();
					console.log(JSON.stringify(props));
				});
			});
		});
	});
}

function mobileSDKLocator() {
	//Check to see if the Titanium Mobile SDK files exist.
	fs.readdir(props.sdkRoot, function(err, files) {
		if (err) throw err;
		if (files.length > 1) {
			console.log('Titanium SDK located!');
			getUserConfig();
		} else {
			// Download and install latest sdk
			console.log('Downloading latest Titanium SDK ..');
		}
	});	
}

function iOSSDKLocator() {
    console.log('Locating iOS SDKs ... ');

	//Check the path to Apple developer tools
    child = exec("xcode-select -print-path", function(err, stdout, stderr) {
    	if (err) throw err;
    	
		var developerPath = stdout.replace('\n','');
		//stat the developer path to make sure its a directory
        fs.stat(developerPath, function(error, stats) {
			if (error) throw error;
            if (stats.isDirectory()) {
                props.developerPath = developerPath;
                console.log('Found developer path!');
                
                //Make sure an iOS sdk exists
                var subchild = exec("xcodebuild -showsdks", function(err, stdout, stderr) {
                	if (err) throw err;
                	var sdkRoot = path.join(props.developerPath, 'Platforms/iPhoneSimulator.platform/Developer/SDKs');
                	//stat the sdk path to make sure its a directory
                	fs.stat(sdkRoot, function(error, stats) {
                		if (error) throw error;
                		if(stats.isDirectory()) {
                			console.log('Found iOS SDKs!');
                			//everything is good to go, lets check for Titanium SDKs
                			mobileSDKLocator();
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
	props.sdkRoot = consta.SDK_ROOT_PATH_MACOSX;
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
