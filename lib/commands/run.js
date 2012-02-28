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

//execute the command - will be passed the global configuration
//object and the command line arguments passed in
/**
exports.execute = function(config, args, logger) {
	support.echo(config,args);
};


**/

//Old content
//-----------


// titaniun run --platform (iphone | ipad | android) [--directory=./]

function runiOSSimurator(platform) {

	var ios_version = '5.0'; // TODO
	//var ios_dir = directory + "/build/iphone"; // TODO
	var ios_sim = '~/Library/Application Support/Titanium/mobilesdk/osx/1.8.1/iphone/ios-sim';

	tiSDK.runScript("'"+conf.mobileSdkRoot+"/1.8.0.1/iphone/builder.py' run '"+conf.projectRoot+"' "+ios_version+" '"+conf.tiapp.id+"' '"+conf.tiapp.name+"'");

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

