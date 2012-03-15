var support = require('../support'),
    path = require('path'),
    tiSDK = {};

exports.doc = {
    command: 'titanium run', 
    description: 'Run a project on a device sim/emulator', 
    usage: 'titanium run [iphone, retina (uses retina iphone), ipad, android, web, blackberry]', 
    options: {
        '-v, --verbose': 'Verbose logging output'
    }
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


exports.execute = function(config, args, logger) {
    conf = require('../support/config').getConfig();
    tiSDK = require('../support/tisdk');
    var os_SDK;

    // platform can now be args[0] OR the value of -p OR the value of --platform
    var platform = typeof args[0] === Array ? args[0].platform || args[0].p : args[0];

    var choices = {};
    for( i=0; i<config.tiapp['deployment-targets'].target.length; i++) {
        choices[config.tiapp['deployment-targets'].target[i].device] = config.tiapp['deployment-targets'].target[i]['$t'];
    }

    if( platform === undefined && config.tiapp['deployment-targets'] !== undefined ) {

        if(process.platform === 'darwin' ) {
            if(choices['iphone']) {
                platform = 'iphone';
            } else if(choices['ipad']) {
                platform = 'ipad';
            } else if(choices['android']) {
                platform = 'android';
            } else {
                platform = 'mobileweb';
            }
        } else {
            if(choices['android']) {
                platform = 'android';
            } else if(choices['mobileweb']) {
                platform = 'mobileweb';
            } else {
                platform = 'blackberry';
            }
        }
    } else if(platform === undefined && process.platform !== 'darwin') {
        platform = 'android';
    } else if( platform === undefined ) {
        platform = 'iphone';
    }

    if(config.tiapp['deployment-targets'] !== undefined && choices[platform]) {
        if(platform !== 'retina' || (platform === 'retina' && !choices['iphone']) ) {
            support.warn('[WARNING] The chosen platform is disabled in tiapp.xml... this can cause some issues...');
        }
    }

    // arg 0 is a float/int and this not the platform but rather the SDK (used when user is running the default platform)
    if ( parseFloat(typeof args[0] === Array ? args[0].sdk || args[0].s : args[0]) ) {
        os_SDK = typeof args[0] === Array ? args[0].sdk || args[0].s : args[0];

    // arg 1 is a float/int and this not the platform but rather the SDK
    } else if( parseFloat(typeof args[1] === Array ? args[1].sdk || args[1].s : args[1]) ) {
        os_SDK = typeof args[1] === Array ? args[1].sdk || args[1].s : args[1];
    }

    if( args.has('v') || args.has('verbose') ) {
        verbose = true;
    }

    switch(platform) {
        case 'iphone':
            killiOSSimurator();
            runiOSSimulator('iphone', os_SDK);
            break;

        case 'retina':
            killiOSSimurator();
            runiOSSimulator('iphone retina', os_SDK);
            break;

        case 'ipad':
            killiOSSimurator();
            runiOSSimulator('ipad', os_SDK);
            break;

        case 'android':
            runAndroidEmulator(os_SDK);
            break;

        case 'web':
            runMobileWeb();
            break;

        case 'blackberry':
            support.error('[ERROR] running blackberry is not yet fully implamented in the CLI');
            //runMobileWeb();
            break;

        default:
            support.error("Unknown platform: %s", platform);
            break;
        }

};

