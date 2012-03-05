var support = require('../support'),
	config = require('../support/config'),
	fs = require('fs'),
	wrench = require('wrench'),
	props = {};

exports.doc = {
	command: 'titanium create', 
	description: 'Create a new Titanium project. By default, it will create a mobile project targeting all supported platforms.', 
	usage: 'titanium create [-v] [-a <targets>] [-t <type>] [-p <path>] project_name', 
	options: {
		'-a, --targets': 'A comma separated list of the platforms to target. [android,ios,mobileweb]', 
		'-p, --path': 'Path for new project. [current working directory]',
		'-t, --type': 'project, module, or plugin. [project]',
		'-v, --verbose': 'Verbose logging output'
	}
};

//Clean a project directory based on the given arguments
exports.execute = function(args, logger) {
	props = config.getConfig(false, true);
	logger.info(props);
	//marshall arguments
	// var platform = (args[0] === 'iphone' || args[0] === 'android' || args[0] === 'web') ? args[0] : 'all',
	// 		rootPath = process.cwd();
	// 		
	// 	for (var i = 0, l = args.length; i<l; i++) {
	// 		if (args[i]['p']||args[i]['path']) {
	// 			rootPath = args[i]['p']||args[i]['path'];
	// 		}
	// 	}
	// 	
	// 	try {
	// 		var stats = fs.lstatSync(rootPath);
	// 	}
	// 	catch (e) {
	// 		logger.error('No directory found at '+rootPath);
	// 		return;
	// 	}
	// 	
	// 	logger.debug('Cleaning project at path: '+rootPath);
	// 	
	// 	// validate that the build folder exists.  If it doesn't assume this is a fresh clone and create it...
	// 	var buildPath = rootPath+'/build';
	// 	try {
	// 		var stats = fs.lstatSync(buildPath);
	// 	}
	// 	catch (e) {
	// 		logger.warn('No build directory found at '+buildPath+', will be created...');
	// 		fs.mkdirSync(buildPath,'777');
	// 	}
	// 	
	// 	//clean the platform-specific build directories...
	// 	function cleanBuildDirectory(platform) {		
	// 		var cleanPath = buildPath+'/'+platform;
	// 		logger.debug('Cleaning '+platform+' build at: '+cleanPath);
	// 		try {
	// 			var stats = fs.lstatSync(cleanPath);
	// 			wrench.rmdirSyncRecursive(cleanPath);
	// 		}
	// 		catch (e) {
	// 			logger.warn('No platform build directory found at '+cleanPath+', will be created...');
	// 		}
	// 		fs.mkdirSync(cleanPath,'777');
	// 	}
	// 	
	// 	// right now hard coded to look at platforms we know we support
	// 	if (platform === 'all' || platform === 'android') {
	// 		cleanBuildDirectory('android');
	// 	}
	// 	if (platform === 'all' || platform === 'iphone') {
	// 		cleanBuildDirectory('iphone');
	// 	}
	//     if (platform === 'all' || platform === 'web') {
	// 		cleanBuildDirectory('mobileWeb');
	// 	}
	// 	
	// 	logger.info('Project build directories cleaned and reinitialized.');
};