var support = require('../support'),
	config = require('../support/config'),
	fs = require('fs'),
	wrench = require('wrench'),
	uuid = require('node-uuid'),
	props = {};

exports.doc = {
	command: 'titanium create', 
	description: 'Create a new Titanium project. By default, it will create a mobile project targeting all supported platforms.', 
	usage: 'titanium create PROJECT_NAME [-v] [-a [targets]] [-t [type]] [-p [path]]', 
	options: [
		['-d, --desc <desc>', 'Description of your project', ''],
		['-i, --id <id>', 'Your application id', ''],
		['-p, --path <path>', 'Path for new project. [cwd]', ''],
		['-t, --target <target>', 'Platforms to target [android,ios,mobileweb]', 'android,ios,mobileweb'], 
		['-b, --template <template>', 'Template on which to base the project', 'base'],
		['-T, --type <type>', 'project, module, or plugin. [project]', 'project'],
		['-v, --verbose', 'Verbose logging output']
	]
};

//Clean a project directory based on the given arguments
exports.execute = function(args, options, logger) {
	props = config.getConfig(false, true);
	
	// validate project name & id
	var name = args.shift();
	if (/^[A-Za-z]+[A-Za-z0-9_-]*/.test(name) === false) {
		logger.error('Invalid project name "' + name + '". Project names must start with a letter and contain only letters, numbers, dashes, and underscores.');
		return;
	}
	options.id = options.id || props.appIdPrefix + '.' + name;
	options.target = options.target.split(',');
	options.path = options.path || process.cwd() + '/' + name;
	
	// create project directory
	try {
		fs.statSync(options.path);
		logger.error('The path "' + options.path + '" already exists.');
		return;
	} catch(e) { }
	fs.mkdirSync(options.path, 0755);
	
	// Let's fill the project directory with the required files
	wrench.copyDirSyncRecursive('templates/base', options.path + '/');
	for (var i = 0; i < options.target.length; i++) {
		if (options.target[i] === 'ios') {
			fs.mkdirSync(options.path + '/build/iphone', 0755);
			fs.mkdirSync(options.path + '/Resources/iphone', 0755);
		} else {
			fs.mkdirSync(options.path + '/build/' + options.target[i], 0755);
			fs.mkdirSync(options.path + '/Resources/' + options.target[i], 0755);
		}
	}
	
	// Create manifest file
	var fd = fs.openSync(options.path + '/manifest', 'w');
	var m = '#appname: ' + name + '\n';
	m    += '#publisher: ' + props.appPublisher + '\n';
	m    += '#url: ' + props.appPublisherURL + '\n';
	m    += '#image: appicon.png\n';
	m    += '#appid: ' + options.id + '\n';
	m    += '#desc: ' + options.desc + '\n';
	m    += '#type: ' + options.target[0] + '\n';
	m    += '#guid: ' + uuid.v4() + '\n';
	fs.writeSync(fd, m, 0);
};