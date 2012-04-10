var path = require('path'),
	async = require('async'),
	xml2js = require('xml2js'),
	net = require('net'),
	fs  = require('fs'),
	spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	constants = require('../support/constants'),
	logger,
	__self;

//############## MODULE INTERFACE ################//
function Android(options) {
	__self = this;
	logger = options.logger;
	var sdkPath = options.androidPath;

	this.paths = {
		sdk: sdkPath,
		adb: path.join(sdkPath, 'platform-tools', 'adb'),
		android: path.join(sdkPath, 'tools', 'android'),
		ddms: path.join(sdkPath, 'tools', 'ddms'),
		emulator: path.join(sdkPath, 'tools', 'emulator'),
		titanium: options.titaniumPath
	};

	this.titanium = {
		build: titaniumBuild,
		deploy: titaniumDeploy,
		run: titaniumRun
	}

	this.adb = {
		restart: adbRestart,
		devices: adbDevices,
		installApp: adbInstallApp,
		runApp: adbRunApp
	}

	this.avd = {
		exists: avdExists,
		running: avdRunning,
		create: avdCreate,
		start: avdStart,
		getSerial: avdGetSerial
	}

	this.getClassNameFromManifest = getClassNameFromManifest;
};
module.exports = Android;

//############## PRIVATE FUNCTIONS ######################//
var titaniumBuild = function(options, tiapp, callback) {
	try {
		logger.debug('Building Android app.apk for ' + tiapp.name)
		var tiBuilderPath = path.join(__self.paths.titanium, options.sdk, 'android', 'builder.py');
	    exec('"' + tiBuilderPath + '" build ' + tiapp.name + ' "' + __self.paths.sdk + '" "' + options.path + '" ' + tiapp.id, 
	        function(err, stdout, stderr) {
	            var errMsg = '';
	            if (err) {
	                errMsg = err;
	                stdout.split('\n').forEach(function(line) {
	                    if (/^\[ERROR\]/.test(line)) {
	                        errMsg += line + '\n';
	                    }
	                });
	                logger.error('Failed to build Android project');
	                logger.error(errMsg);
	                callback(errMsg);
	            } else {
	            	logger.debug('Android project has been built');
	            	callback();
	            }
	        }
	    );
	} catch (e) {
		logger.error('Failed to build Android project');
		logger.error(e);
		callback(e);
	}
};

var titaniumDeploy = function(options, tiapp, deployCallback) {
	var buildPath = path.join(options.path, 'build', 'android'),
        apkPath = path.join(buildPath, 'bin', 'app.apk'),
        manifestPath = path.join(buildPath, 'AndroidManifest.xml'),
        className = null,
        serial = null;

	logger.debug('Deploying ' + tiapp.name + ' to Android device...');
	async.parallel([
		// build apk
		function(parallelCallback) {
			async.series([
				// build apk, if necessary
				function(callback) {
					if (options.nobuild) {
						callback(); 
					} else {
						titaniumBuild(options, tiapp, function(err) {
							callback(err);
						});
					}
				},
				// get the app's classname
				function(callback) {
					logger.debug('Finding AndroidManifest.xml class name for ' + tiapp.name);
					getClassNameFromManifest(manifestPath, function(err, _className) {
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
			adbDevices(function(err, devices) {
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
				adbInstallApp(apkPath, serial, function(err) {
					if (!err) { logger.debug('Application ' + tiapp.name + ' successfully installed to ' + serial); }
					callback(err);
				});
			},
			// run app on device
			function(callback) {
				if (className && !options.noRun) {
					adbRunApp(serial, tiapp.id, className, function(err) {
						if (!err) { logger.debug('Application ' + tiapp.name + ' should now be running on your Android device'); }
						callback(err);
					});
				} else {
					logger.info('Application installed. You can now run it from the Android device.');
					callback();
				}
			}
		],
		function(err, result) {
			deployCallback(err);
		});
	});
};

var titaniumRun = function(options, tiapp, callback) {
	var buildPath = path.join(options.path, 'build', 'android'),
        apkPath = path.join(buildPath, 'bin', 'app.apk'),
        manifestPath = path.join(buildPath, 'AndroidManifest.xml');

    // Establish avd name, or create one from a target id and skin
    // TODO: Validate targets and skins
    var noAvdOptions = !options.avdTargetId && !options.avdSkin && !options.avdName;
    options.avdTargetId = options.avdTargetId || constants.RUN_AVD_TARGET;
    options.avdSkin = options.avdSkin || constants.RUN_AVD_SKIN;
    var avdName = options.avdName || [constants.RUN_AVD_PREFIX, options.avdTargetId, options.avdSkin].join('_'),
        doesAvdExist = false,
        serial, 
        className;

    // build apk and run on emulator
    async.parallel([ 
    	// build apk, if necessary
		function(parallelCallback) {
			async.series([
				// build apk, if necessary
				function(callback) {
					if (options.nobuild) {
						callback(); 
					} else {
						titaniumBuild(options, tiapp, function(err) {
							callback(err);
						});
					}
				},
				function(callback) {
					logger.debug('Searching for app class name in AndroidManifest.xml');
                    getClassNameFromManifest(manifestPath, function(err, _className) {
                        className = _className;
                        if (className !== null) {
                            logger.debug('Found app class name: ' + className);
                        }
                        callback(err);
                    });
				}
			],
			function(err, result) {
				parallelCallback(err);
			});
		},
        // Make sure we have an appropriate emulator running
        function(parallelCallback) {
            async.series([
                // Restart adb
                function(callback) {       
                    if (options.restartAdb) {
                        logger.debug('Restarting adb...');
                        adbRestart(function(err) { callback(err); });
                    } else {
                        callback();
                    }
                },
                // See if we can us an emulator that's already open
                function(callback) {
                    if (noAvdOptions) {
                        adbDevices(function(err, devices) {
                            if (err) {
                                logger.error(err);
                            } else if (devices) {
                                for (var i = 0; i < devices.length; i++) {
                                    if (devices[i].type === 'emulator') {
                                        doesAvdExist = true;
                                        avdName = devices[i].name;
                                        serial = devices[i].serial;
                                        break;
                                    }
                                }
                            }
                            callback();
                        });
                    } else {
                        callback();
                    }
                },
                // Make sure the given AVD name exists
                function(callback) {
                    // Do we already know the AVD exists?
                    if (doesAvdExist) {
                        callback();
                        return;
                    }

                    // Check the given AVD parameters, or try the default
                    logger.debug('Making sure AVD "' + avdName + '" exists');
                    avdExists(avdName, function(exists) {
                        if (exists) {
                            doesAvdExist = true;
                            callback();
                        } else {
                            if (options.avdName) {
                                callback('Invalid AVD name "' + avdName + '"');
                            } else {
                                logger.debug('Couldn\'t find AVD with target "' + options.avdTargetId + '" and skin "' + options.avdSkin + '", creating a new one...');
                                callback();
                            }
                        }
                    })
                },
                // Create AVD if it doesn't exist
                function(callback) {
                    if (!doesAvdExist) {
                        android.avd.create(avdName, options.avdTargetId, options.avdSkin, function(err) {
                            callback(err);
                        });
                    } else {
                        callback();
                    }
                },
                // Make sure the AVD is running
                function(callback) {
                    // Do we already have the serial number?
                    if (serial) {
                        callback();
                        return;
                    }

                    logger.debug('Checking to see if "' + avdName + '" is already running...');
                    avdRunning(avdName, function(isRunning, _serial) {
                        serial = _serial;
                        if (!isRunning) {
                            logger.debug('Starting AVD "' + avdName + '"');
                            avdStart(
                                avdName, 
                                function(_serial) {
                                    if (_serial === null) {
                                        callback('Could not find serial number for AVD "' + avdName + '"');
                                    } else {
                                        logger.debug('AVD "' + avdName + '" serial number is ' + _serial);
                                        serial = _serial;
                                        callback();
                                    }
                                },
                                function(msg) {
                                    logger.debug(msg);
                                }
                            );
                        } else {
                            logger.debug('AVD "' + avdName + '" serial number is ' + _serial);
                            callback();
                        }
                    });
                }
            ],
            function(err, results) {
                if (!err) {
                    logger.debug('AVD "' + avdName + '" should be running');
                }
                parallelCallback(err);
            });
        }
    ],
    // If err === null, the APK has been built and we have an emulator running
    function(err, result) {
        if (err) {
            logger.error(err);
        } else {
            async.series([
                // Install the APK to the AVD
                function(callback) {
                    logger.debug('Installing app.apk to "' + avdName + '"...');
                    adbInstallApp(apkPath, serial, function(err) {
                        callback(err);
                    });
                },
                // Run the APK from the AVD
                function(callback) {
                    if (!className) {
                        callback('Unable to find class name in "' + manifestPath + '". You need to start the app manually.');
                        callback();
                    } else {
                        logger.debug('Launching app.apk in AVD "' + avdName + '"...');
                        adbRunApp(serial, tiapp.id, className, function(err) {
                            callback(err);
                        });
                    }   
                }
            ],
            function(err, result) {
                if (err) {
                    logger.error(err);
                } else {
                    if (className) {
                        logger.info('Application "' + tiapp.name + '" is now running on AVD "' + avdName + '"');
                    } else {
                        logger.info('Application installed. You can now run it from the application menu.');
                    }
                }
            });
        }
    });
};

var adbRestart = function(callback) {
	async.series([
		// kill any running adb server
		// TODO: sometimes even the kill-server call hangs. We probably need to kill the adb
		//       process to ensure this works after a certain period of time. 
		//       win32: tskill adb
		//       linux & darwin: killall adb
		function(asyncCallback) {
			exec(__self.paths.adb + ' kill-server', function() { asyncCallback(); });
		},
		// start the adb server
		function(asyncCallback) {
			exec(__self.paths.adb + ' start-server', function() { asyncCallback(); });
		}
	],
	function(err, result) {
		if (callback) { callback(err); } 
	});
};

var adbDevices = function(callback) {
	exec(__self.paths.adb + ' devices', function(err, stdout, stderr) {
		if (err !== null) {
			callback(err);
		} else {
			var devices = [],
			    matches,
			    items;

			// parse the output of `adb devices` to find a list of
			// all connected AVDs and devices
		 	stdout.split('\n').forEach(function(line) {
		 		if (matches = line.match(/^\s*([^\s]+)\s+([^\s]+)\s*$/)) {
		 			var device = {
		 				serial:matches[1], 
		 				status:matches[2]
		 			};
		 			if (items = device.serial.match(/^emulator\-(\d+)$/)) {
		 				device.type = 'emulator';
		 				device.port = items[1];
		 			} else {
		 				device.type = 'device';
		 			}
		 			devices.push(device);
		 		}
		 	});

		 	// construct a parallel set of function to get the avd name
		 	// of all running emulators via telnet
		 	var functions = [];
		 	devices.forEach(function(device) {
		 		if (device.type === 'emulator') {
			 		functions.push(function(parallelCallback) {
			 			getAvdNameWithDevice(device, function() {
			 				parallelCallback();
			 			});
			 		});
			 	}
		 	});
		 	async.parallel(functions, function(err, result) {
		 		callback(null, devices);
		 	});
		}
	});
};

var adbInstallApp = function(apk, serial, callback, tries) {
	var wait = 2000;
	var maxTries = 10;
	tries = tries || 0;

	exec(__self.paths.adb + ' -s ' + serial + ' wait-for-device install -r ' + '"' + apk + '"', function(err, stdout, stderr) {
		tries++;
		if (/(?:(^failure|^error))/i.test(stdout)) {
			err = stdout;
			if (/could not access the package manager/i.test(stdout)) {
				if (tries > maxTries) {
					callback('Timeout when trying to install "' + apk + '" to Android avd/device "' + serial + '"');
				} else {
					logger.debug('Android avd/device not yet ready for app install, waiting a few more seconds...');
					setTimeout(function() {
						__self.adb.installApp(apk, serial, callback, tries);
					}, wait);
				}
				return;
			}
		}
		callback(err);
	});
};

var adbRunApp = function(serial, appid, className, callback) {
	var appField = appid + '/' + appid + className;
	var maxTries = 30;
	var wait = 2000;
	var tries = 0;
	var waitForDevice = function() {
		tries++;
		if (tries >= maxTries) {
			callback('Timeout waiting for device to get ready for app launch');
		}
		exec(__self.paths.adb + ' -s ' + serial + ' shell ps', function(err, stdout, stderr) {
			if (/(?:(android\.process\.acore|com\.android\.launcher))/i.test(stdout)) {
				exec(__self.paths.adb + ' -s ' + serial + ' shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n ' + appField, function(err, stdout, stderr) {
					callback(err);
				});
			} else {
				setTimeout(waitForDevice, wait);
			}
		});
	};
	setTimeout(waitForDevice, wait);
};

var avdExists = function(avdName, callback) {
	path.exists(getAndroidAvdPath(avdName + '.ini'), callback);
};

var avdRunning = function(avdName, callback) {
	var isRunning = false,
		serial = null;
	adbDevices(function(err, devices) {
		if (err) {
			callback(false);
		} else {
			devices.forEach(function(device) {
                if (device.name === avdName) {
                    isRunning = true;
                    serial = device.serial;
                }
            });
            callback(isRunning, serial);
		}
	});
};

var avdCreate = function(avdName, targetId, skin, callback) { 
	exec('echo no | ' + __self.paths.android + ' create avd -n ' + avdName + ' -t ' + targetId + ' -s ' + skin, function(err, stdout, stderr) {
		callback(err);
	});
};

var avdStart = function(avdName, callback) {
	// TODO: How do I get the android emulator to launch in the background and 
	//       not take over the command line? Ampersand doesn't seem to be
	//       working.
	spawn(__self.paths.emulator, ['-avd', avdName, '-no-boot-anim']);
	
	if (callback) {
		var maxTries = 8;
		var wait = 2000;
		var tries = 0;
		var didAdbRestart = false;

		var lookForSerial = function() {
			tries++;
			if (tries >= maxTries) {
				if (!didAdbRestart) {
					tries = 0;
					didAdbRestart = true;
					logger.debug('Couldn\'t find serial number. Restarting adb and trying again.');
					__self.adb.restart(function() {
						setTimeout(lookForSerial, wait);
					});
				} else {
					callback(null);
				}
				return;
			}
			logger.debug('Try #' + tries + ' to find serial number for AVD "' + avdName + '"...');
			avdGetSerial(avdName, function(serial) {
				if (serial === null) {
					setTimeout(lookForSerial, wait);
				} else {
					callback(serial);
				}
			});
		};
		setTimeout(lookForSerial, wait);
	}
};

var avdGetSerial = function(avdName, callback) {
	var serial = null;
	adbDevices(function(err, devices) {
		devices.forEach(function(device) {
			if (device.name === avdName) {
				serial = device.serial;
			}
		});
		callback(serial);
	});
};

var getClassNameFromManifest = function(manifestPath, callback) {
	var className = null;
	var parser = new xml2js.Parser({
        explicitArray:true
    });

    fs.readFile(manifestPath, function(err, data) {
        if (err) { callback(err); return; }
        parser.parseString(data, function (err, result) {
        	if (err) { callback(err); return; }
            var acts = result['application'][0]['activity'];
            acts.forEach(function(act) {
                var intents = act['intent-filter']; 
                if (intents) {
                    intents.forEach(function(intent) {
                        try {
                            if (intent['action'][0]['@']['android:name'] === 'android.intent.action.MAIN') {
                                intent['category'].forEach(function(category) {
                                    if (category['@'] && 
                                        category['@']['android:name'] == 'android.intent.category.LAUNCHER') {
                                        className = act['@']['android:name'];
                                    }
                                });
                            }
                        } catch (e) {}
                    });
                }
            });
            callback(null, className);
        });
    });
};

//############## HELPERS #####################//
var getAndroidAvdPath = function(avdName) {
	var avdPath = '';
    switch (process.platform) {
        case 'darwin':
        case 'linux':
            avdPath = path.join(process.env.HOME, '.android', 'avd');
            break;
        case 'win32':
            avdPath = path.join(process.env.USERPROFILE, '.android', 'avd');
            break;
        default:
            logger.error('Unsupported platform "' + process.platform + '"');
            return null;
    }
    return avdName ? path.join(avdPath, avdName) : avdPath;
};

var getAvdNameWithPort = function(port, callback) {
	var avdNamePattern = /OK\s+(.+?)\s+OK/m;
	var avdName = null;
	var allData = '';

	var client = net.connect(port, function() { 
        client.write('avd name\r\n');
    });
    client.on('data', function(data) {
    	allData += data.toString();
    	if (/\r\n$/.test(data)) {
    		client.end();
    	}
    });
    client.on('end', function() {
    	if (matches = allData.match(avdNamePattern)) {
    		avdName = matches[1];
    	} 
        callback(avdName);
    });
};

var getAvdNameWithDevice = function(device, callback) {
	getAvdNameWithPort(device.port, function(name) {
		device.name = name;
		callback();
	});
}