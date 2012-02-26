var support = require('../support'),
	fs = require('fs'),
	wrench = require('wrench');

exports.description = 'Clean the current Titanium project build directories';
exports.help = function() {
	support.printHeader('titanium clean');
	console.log('\nUsage:');
	console.log('titanium clean [ios, android]\n');
	console.log('Options:');
	support.printAligned('-v, --verbose', 'Verbose logging output');
	support.printAligned('-p, --path', 'Project path to clean - defaults to current working directory');
};

//Clean a project directory based on the given arguments
exports.execute = function(config, args, logger) {
	//marshall arguments
	var platform = (args[0] === 'iphone' || args[0] === 'android') ? args[0] : 'all',
		rootPath = process.cwd();
		
	for (var i = 0, l = args.length; i<l; i++) {
		if (args[i]['p']||args[i]['path']) {
			rootPath = args[i]['p']||args[i]['path'];
		}
	}
	
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
	if (platform === 'all' || platform === 'android') {
		cleanBuildDirectory('android');
	}
	if (platform === 'all' || platform === 'iphone') {
		cleanBuildDirectory('iphone');
	}
	
	logger.info('Project build directories cleaned and reinitialized.');
};