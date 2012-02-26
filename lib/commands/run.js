var support = require('../support');

exports.description = 'Run a project on a device sim/emulator';
exports.help = function() {
	support.printHeader('titanium run');
	console.log('');
	support.printAligned('Usage', 'titanium run [ios, android]');
	console.log('\nOptions:');
	support.printAligned('-v, --verbose', 'Verbose logging output');
};

//execute the command - will be passed the global configuration 
//object and the command line arguments passed in
exports.execute = function(config, args) {
	support.echo(config,args);
};




//Old content
//-----------


// titaniun run --platform (iphone | ipad | android) [--directory=./]

function runiOSSimurator(directory, platform) {
	var ios_version = '5.0'; // TODO
	//var ios_dir = directory + "/build/iphone"; // TODO
	var ios_sim = '~/Library/Application Support/Titanium/mobilesdk/osx/1.8.1/iphone/ios-sim';

	fs.readFile(conf.props.projectRoot + '/tiapp.xml', function(err, data) {
		if (err) throw err;
		var tiapp = JSON.parse(parser.toJson(data))['ti:app'];
		delete tiapp['xmlns:ti'];

		ti.runScript("'"+conf.props.mobileSdkRoot+"/1.8.0.1/iphone/builder.py' run '"+conf.props.projectRoot+"' "+ios_version+" '"+tiapp.id+"' '"+tiapp.name+"'");

	});

/*
		if command == 'run':
			if argc < 3:
				print "Usage: %s run <project_dir> [ios_version]" % os.path.basename(args[0])
				sys.exit(1)
			if argc == 3:
				iphone_version = check_iphone_sdk('4.0')
			else:
				iphone_version = dequote(args[3].decode("utf-8"))
			project_dir = os.path.expanduser(dequote(args[2].decode("utf-8")))
			iphonesim = os.path.abspath(os.path.join(template_dir,'ios-sim'))
			iphone_dir = os.path.abspath(os.path.join(project_dir,'build','iphone'))
			tiapp_xml = os.path.join(project_dir,'tiapp.xml')
			ti = TiAppXML(tiapp_xml)
			appid = ti.properties['id']
			name = ti.properties['name']
			command = 'simulator' # switch it so that the rest of the stuff works
		else:
			iphone_version = dequote(args[2].decode("utf-8"))
			iphonesim = os.path.abspath(os.path.join(template_dir,'ios-sim'))
			project_dir = os.path.expanduser(dequote(args[3].decode("utf-8")))
			appid = dequote(args[4].decode("utf-8"))
			name = dequote(args[5].decode("utf-8"))
			tiapp_xml = os.path.join(project_dir,'tiapp.xml')
			ti = TiAppXML(tiapp_xml)
			
		app_name = make_app_name(name)
		iphone_dir = os.path.abspath(os.path.join(project_dir,'build','iphone'))
		project_xcconfig = os.path.join(iphone_dir,'project.xcconfig')
		target = 'Release'
		ostype = 'os'
		version_file = None
		log_id = None
		provisioning_profile = None
		debughost = None
		debugport = None
		postbuild_modules = []
		
		# starting in 1.4, you don't need to actually keep the build/iphone directory
		# if we don't find it, we'll just simply re-generate it
		if not os.path.exists(iphone_dir):
			from iphone import IPhone
			print "[INFO] Detected missing project but that's OK. re-creating it..."
			iphone_creator = IPhone(name,appid)
			iphone_creator.create(iphone_dir,True)
			sys.stdout.flush()
			
*/
}

function killiOSSimurator() {
	/*
	run.run(['/usr/bin/killall',"ios-sim"],True)
	run.run(['/usr/bin/killall',"iPhone Simulator"],True)
	*/
}

/*
exports.execute = function(env) {
	var directory = env.directory || './';
	switch(env.platform) {
		case 'iphone':
			runiOSSimurator(directory, 'iphone');
			break;

		case 'ipad':
			runiOSSimurator(directory, 'ipad');
			break;

		case 'android':
			runOnAndroid(directory);
			break;

		default:
			console.error("Unknown platform: %s", env.platform);
			break;
		}
};
*/
