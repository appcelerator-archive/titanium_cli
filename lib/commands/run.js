var support = require('../support'),
    tiSDK = require('../support/tisdk');

var conf = {};

exports.description = 'Run a project on a device sim/emulator';
exports.help = function() {
    support.printHeader('titanium run');
    console.log('');
    support.printAligned('Usage', 'titanium run [ios, android, web]');
    console.log('\nOptions:');
    support.printAligned('-v, --verbose', 'Verbose logging output');
};

// titaniun run --platform (iphone | ipad | android) [--directory=./]

function runiOSSimurator(platform, ios_version) {

    // validate ios_version
    if(ios_version === undefined) {
        ios_version = '5.0';
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

    tiSDK.runScript("'"+conf.mobileSdkRoot+"/"+ti_SDK+"/iphone/builder.py' run '"+conf.projectRoot+"' "+ios_version+" '"+conf.tiapp.id+"' '"+conf.tiapp.name+"' " + platform);

}

function killiOSSimurator() {
    /*
    run.run(['/usr/bin/killall',"ios-sim"],True)
    run.run(['/usr/bin/killall',"iPhone Simulator"],True)
    */
}


exports.execute = function(config, args, logger) {
    conf = config;
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

    if(config.tiapp['deployment-targets'] !== undefined && !choices[platform]) {
        if(platform === 'retina' && !choices['iphone']) {
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

    switch(platform) {
        case 'iphone':
            killiOSSimurator();
            runiOSSimurator('iphone', os_SDK);
            break;

        case 'retina':
            killiOSSimurator();
            runiOSSimurator('retina', os_SDK);
            break;

        case 'ipad':
            killiOSSimurator();
            runiOSSimurator('ipad', os_SDK);
            break;

        case 'android':
            runOnAndroid();
            break;

        case 'web':
            //runOnAndroid(config.cwd);
            break;

        default:
            console.error("Unknown platform: %s", platform);
            break;
        }

};

