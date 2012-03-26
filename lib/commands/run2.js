var support = require('../support'),
    config = require('../support/config'),
    validate = require('../support/validate'),
    constants = require('../support/constants'),
    tisdk = require('../support/tisdk'),
    path = require('path');

exports.doc = {
    command: 'titanium run', 
    description: 'Run a project on a device sim/emulator', 
    usage: 'titanium run [iphone,retina,ipad,android,mobileweb,blackberry] [OPTIONS]'
};

exports.getOptions = function() {
    return [
        ['-a, --androidVersion <androidVersion>', 'Android SDK version', 7],
        ['-i, --iosVersion <iosVersion>', 'iOS SDK version'],
        ['-p, --path <path>', 'Project path'],
        ['-s, --sdk <sdk>', 'Titanium SDK version'],
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

function runAndroid(conf, tiapp, tiVersion, projectPath, androidVersion) {
    var verbose = true;

    // TODO: Kill existing android emulator if androidVersion doesn't match existing emulator
    // TODO: Can this be done with one command?
    // TODO: Allow user to specify AVD, android SDK version
    tisdk.runScript("'"+path.join(conf.mobileSdkRoot, tiVersion, 'android', 'builder.py')+"' emulator '"+tiapp.name+"' '"+conf.androidSDKPath+"' '"+projectPath+"' '"+tiapp.id+"' "+androidVersion+" HVGA", verbose);
    tisdk.runScript("'"+path.join(conf.mobileSdkRoot, tiVersion, 'android', 'builder.py')+"' run '" + projectPath + "' '"+conf.androidSDKPath+"'", verbose);
    tisdk.runScript(conf.androidSDKPath, 'platform-tools', 'adb')+"' logcat | grep Ti";
}

function runIos(conf, tiapp, tiVersion, projectPath, iosPlatform, iosVersion) {
    // get ios versions
    var cmd = "'" + path.join(conf.mobileSdkRoot, tiVersion, 'iphone', 'prereq.py')+"' project";
    //support.debug(cmd);
    var iosSDKS = tisdk.returnScript(cmd).sdks;

    if (iosSDKS.length === 0) {
        support.error('No iOS SDKs installed');
        process.exit();
    }
    if (iosVersion) {
        if (!iosSDKS.has(iosVersion)) {
            support.error('iOS SDK "' + iosVersion + '" not installed');
            process.exit();
        }
    } else {
        iosVersion = iosSDKS[0];
    }

    cmd = "'"+path.join(conf.mobileSdkRoot, tiVersion, 'iphone', 'builder.py')+"' run '"+projectPath+"' "+iosVersion+" '"+tiapp.id+"' '"+tiapp.name+"' " + iosPlatform;
    support.debug(cmd);
    tisdk.runScript(cmd, true);
};

exports.execute = function(args, options, logger) {
    var userConf = config.getUserConfig(false);
    config.getTiappXml(function(result) {
        var tiapp = result,
            target,
            targets = [],
            tiVersion = options.sdk || tiapp['sdk-version'],
            projectPath = options.path || process.cwd();
        // console.log(tiapp);
        // console.log(userConf);

        // validate sdk version
        // TODO: validate that path exists
        if (!tiVersion) {
            logger.error('No Titanium SDK found in tiapp.xml');
            process.exit();
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
        //var osTargets = constants['RUN_' + process.platform.toUpperCase() + '_TARGETS'];
        for (var i = 0; i < cliTargets.length; i++) {
            target = cliTargets[i];
            if (!tiappTargets.has(target)) {
                logger.error('Target "' + target + '" not configured in this project\'s tiapp.xml file.');
                process.exit();
            } 
        }

        // OK, we've verified the list of targets. Let's run.
        for (var i = 0; i < cliTargets.length; i++) {
            target = cliTargets[i];
            switch(target) {
                case 'iphone':
                    runIos(userConf, tiapp, tiVersion, projectPath, 'iphone', options.iosVersion);
                    break;
                case 'retina':
                    runIos(userConf, tiapp, tiVersion, projectPath, 'iphone retina', options.iosVersion);
                    break;
                case 'ipad':
                    runIos(userConf, tiapp, tiVersion, projectPath, 'ipad', options.iosVersion);
                    break;
                case 'android':
                    runAndroid(userConf, tiapp, tiVersion, projectPath, options.androidVersion);
                    break;
                default:
                    logger.error('Run target "' + target + '" is not yet implemented.');
                    break;
            }
        }
    });
};

