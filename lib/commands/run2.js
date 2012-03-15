var support = require('../support'),
    config = require('../support/config'),
    validate = require('../support/validate'),
    constants = require('../support/constants'),
    tisdk = require('../support/tisdk'),
    path = require('path');

exports.doc = {
    command: 'titanium run', 
    description: 'Run a project on a device sim/emulator', 
    usage: 'titanium run [iphone, retina (uses retina iphone), ipad, android, web, blackberry]'
};

exports.getOptions = function() {
    return [
        ['-v, --verbose', 'Verbose logging output']
    ];
};

var conf = {};
var verbose = false;

Array.prototype.has=function(v){
    for (i=0;i<this.length;i++){
    if (this[i]==v) return true;
    }
    return false;
};

// titaniun run --platform (iphone | ipad | android) [--directory=./]

function runiOSSimulator(platform, ios_version) {

    if( conf.tiapp['sdk-version'] !== undefined ) {

        if( tiSDK.exists(conf.tiapp['sdk-version']) ) {
            var ti_SDK = conf.tiapp['sdk-version'];
        } else {
            support.warn('[WARN] Ti SDK '+conf.tiapp['sdk-version']+' was not found on this system, using version' + tiSDK.maxVersion());
            var ti_SDK = tiSDK.maxVersion();
        }

    } else {
        var ti_SDK = tiSDK.maxVersion();
    }

    var iosSDKS = tiSDK.returnScript("'"+path.join(conf.mobileSdkRoot, ti_SDK, '/iphone/prereq.py')+"' '"+conf.projectRoot+"'").sdks;

    if(ios_version === undefined) {
        ios_version = iosSDKS[0];
    } else {
        if( ! iosSDKS.has(ios_version) ) {
            support.warn('[WARNING] The iOS SDK you requested is not installed on this system, using '+iosSDKS[0]+' insted.');
            ios_version = iosSDKS[0];
        }
    }

    console.log("'"+path.join(conf.mobileSdkRoot, ti_SDK, '/iphone/builder.py')+"' run '"+conf.projectRoot+"' "+ios_version+" '"+conf.tiapp.id+"' '"+conf.tiapp.name+"' " + platform);

    tiSDK.runScript("'"+path.join(conf.mobileSdkRoot, ti_SDK, '/iphone/builder.py')+"' run '"+conf.projectRoot+"' "+ios_version+" '"+conf.tiapp.id+"' '"+conf.tiapp.name+"' " + platform, verbose);

}

function runAndroidEmulator(android_version) {

    // validate android_version
    if(android_version === undefined) {
        android_version = '10';
    }

    if( conf.tiapp['sdk-version'] !== undefined ) {

        if( tiSDK.exists(conf.tiapp['sdk-version']) ) {
            var ti_SDK = conf.tiapp['sdk-version'];
        } else {
            support.warn('[WARN] Ti SDK '+conf.tiapp['sdk-version']+' was not found on this system, using version' + tiSDK.maxVersion());
            var ti_SDK = tiSDK.maxVersion();
        }

    } else {
        var ti_SDK = tiSDK.maxVersion();
    }

    tiSDK.runScript("'"+path.join(conf.mobileSdkRoot, ti_SDK, 'android', 'builder.py')+"' simulator '"+conf.tiapp.name+"' '"+conf.androidSDK+"' '"+conf.projectRoot+"' '"+conf.tiapp.id+"' "+android_version, verbose);

    tiSDK.runScript("'"+path.join(conf.androidSDK, 'platform-tools', 'adb')+"' logcat | grep Ti");
}

function runMobileWeb(version) {

    if( conf.tiapp['sdk-version'] !== undefined ) {

        if( tiSDK.exists(conf.tiapp['sdk-version']) ) {
            var ti_SDK = conf.tiapp['sdk-version'];
        } else {
            support.warn('[WARN] Ti SDK '+conf.tiapp['sdk-version']+' was not found on this system, using version' + tiSDK.maxVersion());
            var ti_SDK = tiSDK.maxVersion();
        }

    } else {
        var ti_SDK = tiSDK.maxVersion();
    }

    support.warn('[WARNING] The app is now compiled in '+conf.projectRoot+'/build/mobileweb/index.html but we can\'t auto launch in a browser');

    tiSDK.runScript("'"+path.join(conf.mobileSdkRoot, ti_SDK, 'mobileweb', 'builder.py')+"' '"+conf.projectRoot+"' run");

}

function killiOSSimurator() {
    /*
    run.run(['/usr/bin/killall',"ios-sim"],True)
    run.run(['/usr/bin/killall',"iPhone Simulator"],True)
    */
}

function runIphone(conf) {
    // get ios versions
    var iosSDKS = tisdk.returnScript("'" + path.join(conf.mobileSdkRoot, conf.tiapp['sdk-version'], '/iphone/prereq.py')+"' '"+conf.projectRoot+"'").sdks;
    console.log(iosSDKS);
};

exports.execute = function(args, options, logger) {
    config.getConfig(false, false, function(json) {
        var target,
            targets = [],
            tiVersion = json.tiapp['sdk-version'];

        // validate sdk version
        if (!tiVersion) {
            logger.error('No Titanium SDK found in tiapp.xml');
            process.exit();
        }

        // Get targets from the CLI
        var cliTarget = args.shift();
        var cliVersion = args.shift();
        var cliTargets = [];
        if (cliTarget) {
            cliTargets = validate.contains(cliTarget.split(','), constants.RUN_TARGETS);
        } else {
            // run default, or all
        }

        // Get targets from the tiapp.xml
        var jsonTargets = json.tiapp['deployment-targets'].target;
        var tiappTargets = [];
        for (var i = 0; i < jsonTargets.length; i++) {
            target = jsonTargets[i];
            if (target['#'] === 'true') {
                tiappTargets.push(target['@']['device']);
            }
        }

        // Confirm that all CLI targets are supported by the tiapp.xml targets.
        // We also need to make sure the targets are supported by the OS.
        var osTargets = constants['RUN_' + process.platform.toUpperCase() + '_TARGETS'];
        for (var i = 0; i < cliTargets.length; i++) {
            target = cliTargets[i];
            if (!tiappTargets.has(target)) {
                logger.error('Target "' + target + '" not configured in this project\'s tiapp.xml file.');
                process.exit();
            } else if (!osTargets.has(target)) {
                logger.error('Target "' + target + '" not supported on this operating system.');
                process.exit();
            }
        }

        // OK, we've verified the list of targets. Let's run.
        for (var i = 0; i < cliTargets.length; i++) {
            target = cliTargets[i];
            switch(target) {
                case 'iphone':
                    runIphone(json, cliVersion);
                    break;
                default:
                    logger.error('Run target "' + target + '" is not yet implemented.');
                    break;
            }
        }
    });
};

