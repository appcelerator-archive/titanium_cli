var config = require('../support/config'),
    validate = require('../support/validate'),
    constants = require('../support/constants'),
    tisdk = require('../support/tisdk'),
    path = require('path'),
    async = require('async'),
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
        ['-s, --sdk <sdk>', 'Titanium SDK version'],
        ['-x, --nobuild', 'Don\'t build the project']
    ],
    needsConfig: true
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

    // Get values from tiapp.xml
    config.getTiappXml(path.join(options.path,'tiapp.xml'), function(tiapp) {
        // Validate Titanium SDK
        options.sdk = options.sdk || tiapp['sdk-version'] || tisdk.getMaxVersion();
        logger.debug('Using Titanium SDK ' + options.sdk);

        // Make sure all build targets are valid
        var targets = validate.platformTargets(
            args[0] ? args[0].split(',') : [], 
            constants.RUN_TARGETS[process.platform],
            tiapp
        ); 
        var functions = [];
        var iosHasRun = false;

        // Create array of functions for the builds
        targets.forEach(function(target) {
            var moduleOptions = {
                logger: logger,
                titaniumPath: userConf.mobileSdkRoot,
                androidPath: userConf.androidSDKPath,
                iosTarget: target
            }
            var moduleTarget = target;
            if (target === 'iphone' || target === 'ipad' || target === 'retina') {
                if (iosHasRun) {
                    return;
                }
                moduleTarget = 'ios';
                iosHasRun = true;
            }
            
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

