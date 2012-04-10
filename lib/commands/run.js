var config = require('../support/config'),
    validate = require('../support/validate'),
    constants = require('../support/constants'),
    tisdk = require('../support/tisdk'),
    Android = require('../platform/android'),
    http = require('http'),
    path = require('path'),
    fs = require('fs'),
    url = require('url'),
    async = require('async'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    execSync = require('exec-sync'),
    xml2js = require('xml2js'),
    MOBILEWEB_PORT = 2222,
    logger,
    userConf;

exports.doc = {
    command: 'titanium run', 
    description: 'Run a project on a device sim/emulator', 
    usage: 'titanium run [iphone,retina,ipad,android,mobileweb,blackberry] [OPTIONS]',
    options: [
        ['-a, --avdName <avdName>', 'Android AVD name - run `android list avd` for valid names'],
        ['-b, --avdTargetId <avdTargetId>', 'Android AVD target Id - run `android list target` for valid targets'],
        ['-c, --avdSkin <avdSkin>', 'Android emulator AVD skin'],
        ['-i, --iosVersion <iosVersion>', 'iOS SDK version'],
        ['-m, --mobileWebPort', 'The port to use for local mobileweb server preview'],
        ['-p, --path <path>', 'Project path'],
        ['-r, --restartAdb', 'Restart adb before run'],
        ['-s, --sdk <sdk>', 'Titanium SDK version']
    ],
    needsConfig: true
};

var conf = {};
var verbose = false;

Array.prototype.has=function(v){
    for (i=0;i<this.length;i++){
    if (this[i]==v) return true;
    }
    return false;
};

function runMobileWeb(tiapp, options) {
    var webroot = path.join(options.path, 'build', 'mobileweb');
    options.mobileWebPort = options.mobileWebPort || MOBILEWEB_PORT;
    execSync("'"+path.join(userConf.mobileSdkRoot, options.sdk, 'mobileweb', 'builder.py')+"' '"+options.path+"' run");

    // open a web server for mobile preview
    var server = http.createServer(function(request, response) {
      var uri = url.parse(request.url).pathname,
          filename = path.join(webroot, uri);
      
      path.exists(filename, function(exists) {
        if(!exists) {
          response.writeHead(404, {"Content-Type": "text/plain"});
          response.write("404 Not Found\n");
          response.end();
          return;
        }

        if (fs.statSync(filename).isDirectory()) filename += '/index.html';

        fs.readFile(filename, "binary", function(err, file) {
          if(err) {        
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write(err + "\n");
            response.end();
            return;
          }

          response.writeHead(200);
          response.write(file, "binary");
          response.end();
        });
      });
    });

    // ignore it if the port is already open
    server.on('error', function(e) {
        if (e.code !== 'EADDRINUSE') {
            logger.error(e);
        } else {
            logger.warn('Port ' + options.mobileWebPort + ' is already in use.');
            logger.warn('If your app isn\'t running in the browser, another application may be using the port.');
            logger.warn('Specify a different port with the \'-m, --mobileWebPort\' option, or close the application using the port.');
        }
    });
    server.listen(MOBILEWEB_PORT);

    // open the default browser
    // TODO: is there a way to find the default browser on windows?
    var openCmd = 'open';
    if (process.platform === 'win32') {
        openCmd = 'explorer.exe';
    } else if (process.platform === 'linux') {
        openCmd = 'xdg-open';
    }
    var browser = spawn(openCmd, ['http://localhost:' + MOBILEWEB_PORT]);
    browser.on('exit', function(code) {
        logger.info('Application "' + tiapp.name + '" is now running in the default browser');
    });
}

var getAndroidAvdPath = function() {
    switch (process.platform) {
        case 'darwin':
        case 'linux':
            return path.join('~', '.android', 'avd');
            break;
        case 'win32':
            return path.join(process.env.USERPROFILE, '.android', 'avd');
            break;
        default:
            logger.error('Unsupported platform "' + process.platform + '"');
            return null;
    }
};

function runAndroid(tiapp, options) {
    var tiBuilderPath = path.join(userConf.mobileSdkRoot, options.sdk, 'android', 'builder.py'),
        buildPath = path.join(options.path, 'build', 'android'),
        apkPath = path.join(buildPath, 'bin', 'app.apk'),
        manifestPath = path.join(buildPath, 'AndroidManifest.xml'),
        android = new Android(userConf.androidSDKPath, userConf.mobileSdkRoot, logger);

    // Establish avd name, or create one from a target id and skin
    // TODO: Validate targets and skins
    var noAvdOptions = !options.avdTargetId && !options.avdSkin && !options.avdName;
    options.avdTargetId = options.avdTargetId || constants.RUN_AVD_TARGET;
    options.avdSkin = options.avdSkin || constants.RUN_AVD_SKIN;
    var avdName = options.avdName || [constants.RUN_AVD_PREFIX, options.avdTargetId, options.avdSkin].join('_'),
        avdExists = false,
        serial, 
        className;

    // Why not take advantage of how easy async parallel operations are? Let's
    // build the APK and get the emulator running at the same time.
    async.parallel([ 
        // Build the APK
        function(parallelCallback) {
            logger.debug('Building app.apk for ' + tiapp.name);
            exec('"' + tiBuilderPath + '" build ' + tiapp.name + ' "' + userConf.androidSDKPath + '" "' + options.path + '" ' + tiapp.id, 
                function(err, stdout, stderr) {
                    var errMsg = '';
                    if (!err) {
                        logger.debug('Finished building app.apk for ' + tiapp.name);
                        logger.debug('Getting app class name from AndroidManifest.xml...');
                        android.getClassNameFromManifest(manifestPath, function(err, _className) {
                            className = _className;
                            if (className !== null) {
                                logger.debug('Found app class name: ' + className);
                            }
                            parallelCallback(err);
                        });
                    } else {
                        errMsg = err;
                        stdout.split('\n').forEach(function(line) {
                            if (/^\[ERROR\]/.test(line)) {
                                errMsg += line + '\n';
                            }
                        });
                        parallelCallback(errMsg);
                    }
                }
            );
        },
        // Make sure we have an appropriate emulator running
        function(parallelCallback) {
            async.series([
                // Restart adb
                function(callback) {       
                    if (options.restartAdb) {
                        logger.debug('Restarting adb...');
                        android.adb.restart(function(err) { callback(err); });
                    } else {
                        callback();
                    }
                },
                // See if we can us an emulator that's already open
                function(callback) {
                    if (noAvdOptions) {
                        android.adb.devices(function(err, devices) {
                            if (err) {
                                logger.error(err);
                            } else if (devices) {
                                for (var i = 0; i < devices.length; i++) {
                                    if (devices[i].type === 'emulator') {
                                        avdExists = true;
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
                    if (avdExists) {
                        callback();
                        return;
                    }

                    // Check the given AVD parameters, or try the default
                    logger.debug('Making sure AVD "' + avdName + '" exists...');
                    android.avd.exists(avdName, function(exists) {
                        if (exists) {
                            avdExists = true;
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
                    if (!avdExists) {
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
                    android.avd.running(avdName, function(isRunning, _serial) {
                        serial = _serial;
                        if (!isRunning) {
                            logger.debug('Starting AVD "' + avdName + '"');
                            android.avd.start(
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
                    android.adb.installApp(apkPath, serial, function(err) {
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
                        android.adb.runApp(serial, tiapp.id, className, function(err) {
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
}

function runIos(tiapp, options, iosPlatform) {
    // get ios versions
    var iphoneRootPath = path.join(userConf.mobileSdkRoot, options.sdk, 'iphone'),
        prereqPath = path.join(iphoneRootPath, 'prereq.py'),
        builderPath = path.join(iphoneRootPath, 'builder.py'),
        sdks;

    async.series([
        // get listing of available ios sdks
        function(callback) {
            logger.debug('Checking iOS build prerequisites');
            exec('"' + prereqPath + '" project', function(err, stdout, stderr) {
                if (!err) {
                    try {
                        sdks = JSON.parse(stdout).sdks;
                        logger.debug('Got listing of vailable iOS SDKs');
                        logger.debug(sdks);
                    } catch (e) {
                        err = e;
                    }
                }
                callback(err);
            });
        },
        // validate sdks against options and run
        function(callback) {
            // Make sure we have an iOS SDK installed
            if (sdks.length === 0) {
                callback('No iOS SDKs installed');
                return;
            }

            // Make sure the chosen SDK is installed
            if (options.iosVersion) {
                validate.contains(options.iosVersion, sdks, function(val) {
                    callback('iOS SDK "' + options.iosVersion + '" not installed. You have the following version installed: [' + sdks.join(',') + ']');
                });
            } else {
                options.iosVersion = sdks[0];
            }

            var buildArgs = ['simulator', options.iosVersion, options.path, tiapp.id, tiapp.name, iosPlatform];
            var buildIos = spawn(builderPath, buildArgs);
            var buildError = '';
            logger.debug(builderPath + ' ' + buildArgs.join(' '));
            buildIos.stdout.on('data', function(data) {
                if (('' + data).toLowerCase().indexOf('application started') !== -1) {
                    buildIos.emit('exit');
                }
            });
            buildIos.stderr.on('data', function(data) { 
                buildError += data;
                logger.error(data); 
            });
            buildIos.on('exit', function(data) { 
                if (buildError !== '') {
                    callback(buildError);
                } else {
                    callback();
                } 
            });
        }
    ],
    function(err, result) {
        if (err) { 
            logger.error(err); 
        } else {
            logger.info('Application "' + tiapp.name + '" is now running on ' + iosPlatform + ' version ' + options.iosVersion);
        }
    });
};

exports.execute = function(args, options, _logger) {
    logger = _logger;
    userConf = config.getUserConfig(false);

    // Validate project path
    options.path = options.path || process.cwd();
    if (!path.existsSync(options.path)) {
        logger.die('"' + options.path + '" does not exist');
    } else if (!path.existsSync(path.join(options.path,'tiapp.xml'))) {
        logger.die('"' + options.path + '" is not a valid Titanium project directory (no tiapp.xml)');
    }
    options.path = path.resolve(options.path);

    // Get values from tiapp.xml
    config.getTiappXml(path.join(options.path,'tiapp.xml'), function(result) {
        var tiapp = result,
            target,
            targets = [];

        // Validate Titanium SDK version
        options.sdk = options.sdk || tiapp['sdk-version'];
        if (!tisdk.exists(options.sdk)) {
            logger.die('Titanium SDK version "' + options.sdk + '" not found');
        }

        // Get targets from the CLI
        var cliTarget = args.shift();
        var cliTargets = [];
        if (cliTarget) {
            cliTargets = validate.contains(cliTarget.split(','), constants.RUN_TARGETS[process.platform]);
        } else {
            cliTargets = constants.RUN_TARGETS[process.platform];
        }

        // Get targets from the tiapp.xml
        var jsonTargets = tiapp['deployment-targets'].target;
        var tiappTargets = [];
        for (var i = 0; i < jsonTargets.length; i++) {
            target = jsonTargets[i];
            if (target['#'] === 'true') {
                tiappTargets.push(target['@']['device']);
            }
        }

        if (tiappTargets.has('iphone') || tiappTargets.has('ipad')) {
            tiappTargets.push('retina');
        }

        // Confirm that all CLI targets are supported by the tiapp.xml targets.
        // We also need to make sure the targets are supported by the OS.
        for (var i = 0; i < cliTargets.length; i++) {
            target = cliTargets[i];
            if (!tiappTargets.has(target)) {
                logger.error('Target "' + target + '" not configured in this project\'s tiapp.xml file.');
                process.exit();
            } 
        }

        // OK, we've verified the list of targets. Let's run.
        var didIos = false;
        logger.info('Starting run process for [' + cliTargets.join(',') + ']');
        for (var i = 0; i < cliTargets.length; i++) {
            target = cliTargets[i];
            switch(target) {
                case 'iphone':
                case 'ipad':
                case 'retina':
                    if (!didIos) {
                        didIos = true;
                        runIos(tiapp, options, target === 'retina' ? 'iphone retina' : target);
                    }
                    break;
                case 'android':
                    runAndroid(tiapp, options);
                    break;
                case 'mobileweb':
                    runMobileWeb(tiapp, options);
                    break;
                default:
                    logger.error('Run target "' + target + '" is not yet implemented.');
                    break;
            }
        }
    });
};

