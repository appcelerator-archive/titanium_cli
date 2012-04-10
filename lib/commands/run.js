var config = require('../support/config'),
    validate = require('../support/validate'),
    constants = require('../support/constants'),
    tisdk = require('../support/tisdk'),
    Android = require('../platform/android'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    options,
    logger,
    cmdCallback,
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
        ['-m, --mobileWebPort <mobileWebPort>', 'The port to use for local mobileweb server preview'],
        ['-p, --path <path>', 'Project path'],
        ['-r, --restartAdb', 'Restart adb before run'],
        ['-s, --sdk <sdk>', 'Titanium SDK version']
    ],
    needsConfig: true
};

Array.prototype.has=function(v){
    for (i=0;i<this.length;i++){
    if (this[i]==v) return true;
    }
    return false;
};

function runIos(tiapp, iosPlatform) {
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

exports.execute = function(args, _options, _logger, _cmdCallback) {
    options = _options;
    logger = _logger;
    userConf = config.getUserConfig(false);

    // Normally we'd use logger.die as the fallback cmdCallback,
    // but this will kill the mobileweb preview server and/or the
    // android emulator if we launch one from this command.
    cmdCallback = _cmdCallback || function(){};

    // Validate project path
    options.path = options.path || process.cwd();
    if (!path.existsSync(options.path)) {
        logger.die('"' + options.path + '" does not exist');
    } else if (!path.existsSync(path.join(options.path,'tiapp.xml'))) {
        logger.die('"' + options.path + '" is not a valid Titanium project directory (no tiapp.xml)');
    }
    options.path = path.resolve(options.path);

    // Validate Titanium SDK
    options.sdk = options.sdk || tisdk.getMaxVersion();

    // Get values from tiapp.xml
    config.getTiappXml(path.join(options.path,'tiapp.xml'), function(/*result*/tiapp) {
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
                    
                    logger.debug('Starting ' + target + ' run');
                    instance.titanium.run(options, tiapp, function(err) {
                        callback();
                    });
                } catch (e) {
                    logger.error(target + ' run failed');
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
};

