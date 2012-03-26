var support = require('../support'),
	config = require('../support/config'),
	constants = require('../support/constants'),
	validate = require('../support/validate'),
	tisdk = require('../support/tisdk'),
	fs = require('fs'),
	path = require('path'),
	wrench = require('wrench'),
	uuid = require('node-uuid'),
	mu = require('mu2');

var getCliPath = function() {
	return process.argv[1].replace(/[^\/\\]+$/, '');
};

// exported documentation
exports.doc = {
	command: 'titanium create', 
	description: 'Create a new Titanium project.', 
	usage: 'titanium create PROJECT_NAME [OPTIONS]'
};

// define command line options for this command
exports.getOptions = function() {
	var cliPath = getCliPath();
	var props = config.getConfig(true, true);
	return [
		[
			'-b, --template <template>', 
			'Template on which to base the project', 
			function(val) { return validate.pathDoesExist(cliPath + '../templates/' + val) },
			cliPath + '../templates/base'
		],
		['-d, --desc <desc>', 'Description of your project', ''],
		[
			'-i, --id <id>', 
			'Your application id', 
			function(val) { return validate.reverseDomain(val) }
		],
		[
			'-p, --path <path>', 
			'Path for new project. [cwd]', 
			function(val) { return validate.pathDoesNotExist(val) }
		],
		[
			'-s, --sdk <sdk>', 
			'Titanium SDK version for the project',
			function(val) { validate.pathDoesExist(path.join(props.mobileSdkRoot, val)); return val; },
			tisdk.maxVersion
		],
		[
			'-t, --target <target>', 
			'Platforms to target [android,ios,mobileweb]', 
			function(val) { return validate.contains(val.split(','), constants.CREATE_TARGETS) },
			constants.CREATE_TARGETS
		], 
		[
			'-T, --type <type>', 
			'project, module, or plugin. [project]', 
			function(val) { return validate.contains(val, constants.CREATE_TYPES) },
			'project'
		],
		['-v, --verbose', 'Verbose logging output']
	];
};

//Clean a project directory based on the given arguments
exports.execute = function(args, options, logger) {
	var props = config.getUserConfig(false),
	    cliPath = getCliPath();

	// validate project name
	var name = args.shift();
	if (!name) {
		logger.error('You must specify a project name.');
		return;
	} else if (/^[A-Za-z]+[A-Za-z0-9_-]*/.test(name) === false) {
		logger.error('Invalid project name "' + name + '". Project names must start with a letter and contain only letters, numbers, dashes, and underscores.');
		return;
	}

	options.sdk = !options.sdk ? tisdk.getMaxVersion() : options.sdk;

	// use default appIdPrefix and project name if no app id is specified
	options.id = options.id || props.appIdPrefix + '.' + name;

	// use the current directory and project name as the default path of none is specified
	options.path = options.path || process.cwd() + '/' + name;

	// create the project path
	fs.mkdirSync(options.path, 0755);
	
	// Prepare configuration settings for templates
	var templatePath = options.template;
	var templateCommon = cliPath + '../templates/_common';
	var context = {
		appname: name,
		publisher: props.appPublisher,
		url: props.appPublisherURL,
		copyright: props.appCopyright,
		image: 'appicon.png',
		appid: options.id,
		desc: options.desc,
		type: options.target[0],
		guid: uuid.v4(),
		hasmobileweb: 'false',
		hasandroid: 'false',
		hasios: 'false',
		hasblackberry: 'false',
		sdk: options.sdk
	};

	// Let's fill the project directory with the required files
	wrench.copyDirSyncRecursive(templatePath, options.path + '/');
	for (var i = 0; i < options.target.length; i++) {
		var t = options.target[i];
		context['has' + t] = 'true';
		t = (t === 'ios' ? 'iphone' : t);
		wrench.copyDirSyncRecursive(templateCommon + '/Resources/' + t, options.path + '/Resources/' + t);
		fs.mkdirSync(options.path + '/build/' + t, 0755);
	}

	// Create manifest file  and tiapp.xml from templates
	createFileFromTemplate(templatePath + '/manifest', options.path + '/manifest', context);
	createFileFromTemplate(templatePath + '/tiapp.xml', options.path + '/tiapp.xml', context);
};

var createFileFromTemplate = function(fromFile, toFile, context) {
	var buffer = '';
	mu.renderText(fs.readFileSync(fromFile, 'utf8'), context)
		.on('data', function (c) { buffer += c; })
        .on('end', function () { 
        	var fd = fs.openSync(toFile, 'w');
        	fs.writeSync(fd, buffer, 0);
        });
};