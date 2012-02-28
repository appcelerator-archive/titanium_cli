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

function runiOSSimurator(platform) {

    var ios_version = '5.0'; // TODO
    if( conf.tiapp['sdk-version'] !== undefined ) {

        if( tiSDK.exists(conf.tiapp['sdk-version']) ) {
            var ti_SDK = conf.tiapp['sdk-version'];
        } else {
            console.log('[WARN] Ti SDK '+conf.tiapp['sdk-version']+' was not found on this system, using version' + tiSDK.maxVersion());
            var ti_SDK = tiSDK.maxVersion();
        }

    } else {
        var ti_SDK = tiSDK.maxVersion();
    }

    tiSDK.runScript("'"+conf.mobileSdkRoot+"/"+ti_SDK+"/iphone/builder.py' run '"+conf.projectRoot+"' "+ios_version+" '"+conf.tiapp.id+"' '"+conf.tiapp.name+"'");

}

function killiOSSimurator() {
    /*
    run.run(['/usr/bin/killall',"ios-sim"],True)
    run.run(['/usr/bin/killall',"iPhone Simulator"],True)
    */
}


exports.execute = function(config, args, logger) {
    conf = config;

    // platform can now be args[0] OR the value of -p OR the value of --platform
    var platform = typeof args[0] === Array ? args[0].platform || args[0].p : args[0];

    if( platform === undefined && config.tiapp['deployment-targets'] !== undefined ) {
        var choices = {};
        for( i=0; i<config.tiapp['deployment-targets'].target.length; i++) {
            choices[config.tiapp['deployment-targets'].target[i].device] = config.tiapp['deployment-targets'].target[i]['$t'];
        }

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
    } else if(process.platform !== 'darwin') {
        platform = 'android';
    } else {
        platform = 'iphone';
    }

    switch(platform) {
        case 'iphone':
            killiOSSimurator();
            runiOSSimurator('iphone');
            break;

        case 'ipad':
            killiOSSimurator();
            runiOSSimurator('ipad');
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

