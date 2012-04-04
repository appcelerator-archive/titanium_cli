var constants = require('../support/constants'),
	validate = require('../support/validate'),
	config = require('../support/config'),
	fs = require('fs'),
	path = require('path'),
	wrench = require('wrench'),
	logger;

exports.doc = {
	command: 'titanium clean', 
	description: 'Clean the project build directories', 
	usage: 'titanium clean [ios,android,mobileweb] [OPTIONS]',
	options: [
		['-p, --path <path>', 'Project path to clean - defaults to current working directory']
	],
	needsConfig: false
};

//Clean a project directory based on the given arguments
exports.execute = function(args, options, _logger) {
	//marshall arguments
	logger = _logger;
	var rootPath = options.path || process.cwd(),
		tiappPath = path.join(rootPath, 'tiapp.xml'), 
		buildPath = path.join(rootPath, 'build'), 
		tiappTargets = {},
		tiappArray = [],
		cleanArray = [],
		device = ''; 
	
	// make sure path exists and is a project path
	if (!path.existsSync(rootPath)) { logger.die('"' + rootPath + '" is not a project directory'); }
	if (!path.existsSync(tiappPath)) { logger.die('"' + rootPath + '" is not a Titanium project directory (no tiapp.xml found)'); }
	logger.debug('Cleaning project at path "' + rootPath + '"');

	// make sure we have a 'build' folder
	if (!path.existsSync(buildPath)) {
		logger.warn('No build directory found at "' + buildPath + '". Creating...');
		fs.mkdirSync(buildPath,'777');
	}

	// get project targets from tiapp.xml
	config.getTiappXml(tiappPath, function(tiapp) {
		tiapp['deployment-targets'].target.forEach(function(item) {
			if (item['#'] === 'true') {
				device = item['@']['device'];
				tiappTargets[device === 'ipad' || device === 'iphone' ? 'ios' : device] = true;
			}
		});

		// Move the tiapp targets into an array
		tiappArray = [];
		for (var t in tiappTargets) {
			tiappArray.push(t);
		}

		// validate CLI targets against the tiapp targets
		if (!args[0]) {
			cleanArray = tiappArray;
		} else {
			cleanArray = validate.contains(args[0].split(','), constants.TITANIUM_TARGETS);
			cleanArray = validate.contains(cleanArray, tiappArray, function(val) {
				logger.die('Invalid value "' + val + '". Must be one of the following values from this project\'s tiapp.xml <deployment-targets>: [' + tiappArray.join(',') + ']');
			});
		}

		// clean all build paths in the cliArray
		if (cleanArray.length === 0) {
			logger.info('Nothing to clean.');
		} else {
			cleanArray.forEach(function(target) {
				target = target === 'ios' ? 'iphone' : target;
				var cleanPath = path.join(buildPath, target); 

				// delete and recreate build paths
				logger.debug('* Cleaning "' + cleanPath + "'");
				wrench.rmdirSyncRecursive(cleanPath, true);
				fs.mkdirSync(cleanPath,'777');
			});
			logger.info('Project build directories cleaned and reinitialized.');
		}	
	});
};