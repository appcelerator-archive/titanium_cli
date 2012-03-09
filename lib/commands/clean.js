var support = require('../support'),
	fs = require('fs'),
	wrench = require('wrench');

exports.doc = {
	command: 'titanium clean', 
	description: 'Clean the project build directories', 
	usage: 'titanium clean [ios, android]', 
	options: [
		['-p, --path <path>', 'Project path to clean - defaults to current working directory', process.cwd()],
		['-v, --verbose', 'Verbose logging output']
	]
};

//Clean a project directory based on the given arguments
exports.execute = function(args, options, logger) {
	//marshall arguments
	var platform = (args[0] === 'iphone' || args[0] === 'android' || args[0] === 'web') ? args[0] : 'all',
		rootPath = options.path; 
	
	try {
		var stats = fs.lstatSync(rootPath);
	}
	catch (e) {
		logger.error('No directory found at '+rootPath);
		return;
	}
	
	logger.debug('Cleaning project at path: '+rootPath);
	
	// validate that the build folder exists.  If it doesn't assume this is a fresh clone and create it...
	var buildPath = rootPath+'/build';
	try {
		var stats = fs.lstatSync(buildPath);
	}
	catch (e) {
		logger.warn('No build directory found at '+buildPath+', will be created...');
		fs.mkdirSync(buildPath,'777');
	}
	
	//clean the platform-specific build directories...
	function cleanBuildDirectory(platform) {		
		var cleanPath = buildPath+'/'+platform;
		logger.debug('Cleaning '+platform+' build at: '+cleanPath);
		try {
			var stats = fs.lstatSync(cleanPath);
			wrench.rmdirSyncRecursive(cleanPath);
		}
		catch (e) {
			logger.warn('No platform build directory found at '+cleanPath+', will be created...');
		}
		fs.mkdirSync(cleanPath,'777');
	}
	
	// right now hard coded to look at platforms we know we support
	// TODO: need to validate that each platform is part of this project when 'all' is chosen
	//       In other words, don't create a mobileweb directory if it's not a mobileweb project
	if (platform === 'all' || platform === 'android') {
		cleanBuildDirectory('android');
	}
	if (platform === 'all' || platform === 'iphone') {
		cleanBuildDirectory('iphone');
	}
    if (platform === 'all' || platform === 'web') {
		cleanBuildDirectory('mobileWeb');
	}
	
	logger.info('Project build directories cleaned and reinitialized.');
};