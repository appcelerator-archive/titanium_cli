var path = require('path'),
	exec = require('child_process').exec,
	async = require('async'),
	logger,
	__self;

//############## MODULE INTERFACE ################//
function Mobileweb(titaniumPath, _logger) {
	__self = this;
	logger = _logger;

	this.paths = {
		titanium: titaniumPath
	}

	this.titanium = {
		build: titaniumBuild,
		deploy: titaniumDeploy,
		run: function(){}
	}
};
module.exports = Mobileweb;

var titaniumBuild = function(args, callback) {
	try {
		if (!args.sdk || !args.path) {
			throw 'You must specify a Titanium SDK version and project path';
		}
		var builderPath = '"' + path.join(__self.paths.titanium, args.sdk, 'mobileweb', 'builder.py') + '"';
	    exec(builderPath + ' "' + args.path + '" run', function(err, stdout, stderr) {
    		callback(err);
    	});
	} catch (e) {
		callback(e);
	}
};

var titaniumDeploy = function(args, deployCallback) {
	var buildPath = '"' + path.join(args.path, 'build', 'mobileweb') + '"';

	// Validate the deployment webroot
	if (!args.webroot) {
		deployCallback('No webroot specified for mobileweb deployment');
		return;
	} else if (!path.existsSync(args.webroot)) {
		deployCallback('Webroot "' + args.webroot + '" does not exist');
		return;
	}
	args.webroot = '"' + args.webroot + '"';

	// Build app
	async.series([
		function(callback) {
			if (args.nobuild) {
				callback();
			} else {
				titaniumBuild({ sdk: args.sdk, path: args.path }, function(err) {
					if (err) { 
		    			logger.error('Failed to build mobileweb project');
		    			logger.error(err); 
		    		} else {
		    			logger.debug('Mobileweb project has been built');
		    		}
		    		callback(err);
				});
			}
		},
		function(callback) {
			try {
				// TODO: do this copy properly on windows
	    		exec('cp -rf ' + path.join(buildPath, '*') + ' ' + args.webroot, function(err, stdout, stderr) {
	    			if (!err) { logger.debug('Mobileweb app deployed to ' + args.webroot); }
	    			callback(err);
	    		});
	    	} catch (e) {
	    		logger.error('Failed to deploy mobileweb app to ' + args.webroot);
	    		callback(e);
    		}
		}
	], 
	function(err, result) {
		deployCallback(err);
	});
};