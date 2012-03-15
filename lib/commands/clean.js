var support = require('../support'),
	constants = require('../support/constants'),
	validate = require('../support/validate'),
	config = require('../support/config'),
	fs = require('fs'),
	wrench = require('wrench');

exports.doc = {
	command: 'titanium clean', 
	description: 'Clean the project build directories', 
	usage: 'titanium clean [ios, android, mobileweb]'
};

exports.getOptions = function() {
	return [
		['-p, --path <path>', 'Project path to clean - defaults to current working directory', process.cwd()],
		['-v, --verbose', 'Verbose logging output']
	];
};

//Clean a project directory based on the given arguments
exports.execute = function(args, options, logger) {
	//marshall arguments
	var rootPath = options.path,
		tiappPath = rootPath + '/tiapp.xml',
		buildPath = rootPath + '/build',
		tiappTargets = {},
		tiappArray = [],
		cleanArray = [],
		device = ''; 
	
	// make sure path exists and is a project path
	validate.pathDoesExist(rootPath);
	validate.pathDoesExist(tiappPath, function() {
		logger.error('"' + rootPath + '" is not a Titanium project directory (no tiapp.xml found)');
		process.exit();
	});

	// make sure we have a 'build' folder
	logger.debug('Cleaning project at path: '+rootPath);
	validate.pathDoesExist(buildPath, function() {
		logger.warn('No build directory found at "' + buildPath + '". Creating...');
		fs.mkdirSync(buildPath,'777');
	});

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
				logger.error('Invalid value "' + val + '". Must be one of the following values from this project\'s tiapp.xml <deployment-targets>: [' + tiappArray.join(',') + ']');
				process.exit();
			});
		}

		// clean all build paths in the cliArray
		cleanArray.forEach(function(target) {
			target = target === 'ios' ? 'iphone' : target;
			var cleanPath = buildPath + '/' + target;

			logger.debug('Cleaning '+target+' build at: '+cleanPath);

			// make sure clean path exists
			validate.pathDoesExist(cleanPath, function() {
				logger.warn('No platform build directory found at "'+cleanPath+'". Creating...');
				fs.mkdirSync(cleanPath,'777');
			});

			// only delete build contents if something is there
			validate.pathDoesNotExist(cleanPath + '/*', function() { 
				wrench.rmdirSyncRecursive(cleanPath + '/*');
			});
		});

		logger.info('Project build directories cleaned and reinitialized.');
	});
};