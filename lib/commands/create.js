var config = require('../support/config'),
	constants = require('../support/constants'),
	validate = require('../support/validate'),
	tisdk = require('../support/tisdk'),
	fs = require('fs'),
	path = require('path'),
	wrench = require('wrench'),
	uuid = require('node-uuid'),
	mu = require('mu2'),
	async = require('async'),
	logger;

// exported documentation
exports.doc = {
	command: 'titanium create', 
	description: 'Create a new Titanium project.', 
	usage: 'titanium create PROJECT_NAME [OPTIONS]',
	options: [
		['-b, --template <template>', 'Template on which to base the project'],
		['-d, --desc <desc>', 'Description of your project', ''],
		['-i, --id <id>', 'Your application id'],
		['-o, --overwrite', 'Overwrite existing path if it exists'],
		['-p, --path <path>', 'Path for new project'],
		['-s, --sdk <sdk>', 'Titanium SDK version for the project'],
		['-t, --target <target>', 'Platforms to target [android,ios,mobileweb]'], 
		['-T, --type <type>', 'project, module, or plugin'],
		['-v, --verbose', 'Verbose logging output']
	]
};

//Clean a project directory based on the given arguments
exports.execute = function(args, options, _logger) {
	logger = _logger;
	var cliPath = process.argv[1].replace(/[^\/\\]+$/, '');
	var conf, maxVersion;

	async.series([
		// Get user configuration
		function(callback) {	
			config.getUserConfig(false, function(_conf) {
				conf = _conf;
				callback();
			});
		},
		// get max version of titanium installed
		function(callback) {
			tisdk.getMaxVersion(function(_maxVersion) {
				maxVersion = _maxVersion;
				callback();
			});
		},
		// create the project
		function(callback) {
			// validate project name
			var name = args.shift();
			if (!name) {
				logger.die('You must specify a project name.');
			} else if (/^[A-Za-z]+[A-Za-z0-9_-]*/.test(name) === false) {
				logger.die('Invalid project name "' + name + '". Project names must start with a letter and contain only letters, numbers, dashes, and underscores.');
			}

			// validate creation template
			options.template = options.template || path.join(cliPath, '..', 'templates', 'base');
			if (!path.existsSync(options.template)) {
				logger.die('Template "' + options.template + '" not found at "' + options.template + '"');
			}

			// validate Titanium SDK
			options.sdk = options.sdk || maxVersion;
			if (!options.sdk) {
				logger.die('No valid Titanium SDKs found at "' + conf.mobileSdkRoot + '"');
			} else if (!tisdk.exists(options.sdk)) {
				logger.die('Titanium SDK "' + options.sdk + '" not found at "' + conf.mobileSdkRoot + '"');
			}

			// Validate app id
			options.id = options.id || conf.appIdPrefix + '.' + name;
			if (!validate.reverseDomain(options.id)) {
				logger.die('Invalid app id "' + options.id + '". Must be in reverse-domain format.')
			}

			// Validate targets
			options.target = (options.target || constants.CREATE_TARGETS.join(',')).split(',');
			validate.contains(options.target, constants.CREATE_TARGETS, function(val) {
				logger.die('Invalid project target "' + val + '". Must be one of the following values: [' + constants.CREATE_TARGETS.join(',') + ']');
			});

			// Validate project type
			options.type = options.type || 'project';
			validate.contains(options.type, constants.CREATE_TYPES, function(val) {
				logger.die('Invalid project type "' + val + '". Must be one of the following values: [' + constants.CREATE_TYPES.join(',') + ']');
			});

			// Validate project path and overwrite if necessary
			options.path = options.path || path.join(process.cwd(), name);
			if (path.existsSync(options.path)) {
				if (!options.overwrite) {
					logger.die('"' + options.path + '" already exists.');
				} else {
					try {
						wrench.rmdirSyncRecursive(options.path, false);
					} catch (e) {
						logger.error('Failed to overwrite path "' + options.path + '"');
						logger.die(e);
					}
				}
			}

			//####################################################//
			//############# START CREATING PROJECT ###############//
			//####################################################//
			
			// Create project path
			try {
				fs.mkdirSync(options.path, 0755);
			} catch (e) {
				logger.error('Failed to create project path "' + options.path + '".');
				logger.die(e);
			}
			
			// Prepare configuration settings for templates
			var templatePath = options.template;
			var templateCommon = path.join(cliPath, '..', 'templates', '_common');
			var context = {
				appname: name,
				publisher: conf.appPublisher,
				url: conf.appPublisherURL,
				copyright: conf.appCopyright,
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
			wrench.copyDirSyncRecursive(templatePath, options.path); 
			for (var i = 0; i < options.target.length; i++) {
				var t = options.target[i];
				context['has' + t] = 'true';
				t = (t === 'ios' ? 'iphone' : t);

				wrench.copyDirSyncRecursive(path.join(templateCommon,'Resources',t), path.join(options.path,'Resources',t));
				fs.mkdirSync(path.join(options.path,'build',t), 0755);
			}

			// Create manifest file  and tiapp.xml from templates
			createFileFromTemplate(path.join(templatePath,'manifest'), path.join(options.path,'manifest'), context);
			createFileFromTemplate(path.join(templatePath,'tiapp.xml'), path.join(options.path,'tiapp.xml'), context);
			callback();
		}
	],
	function(err, result) {
		// do nothing
	});
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