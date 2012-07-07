//################ DEPENDENCIES ##################//
var path = require('path'),
	exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	async = require('async'),
	url = require('url'),
	http = require('http'),
	fs = require('fs'),
	constants = require('../support/constants'),
	logger,
	__self;

//############## CONSTANTS ##################//
var WEBSERVER_PORT = 22222;

//############## MODULE INTERFACE ################//
function Mobileweb(options) {
	__self = this;
	logger = options.logger;

	this.paths = {
		titanium: options.titaniumPath
	}

	this.titanium = {
		build: titaniumBuild,
		configure: titaniumConfigure,
		deploy: titaniumDeploy,
		run: titaniumRun
	}
};
module.exports = Mobileweb;

//############## PRIVATE FUNCTIONS ######################//
var titaniumConfigure = function(options, props, callback) {
	callback();
};

var titaniumBuild = function(options, tiapp, callback) {
	try {
		if (!options.sdk || !options.path) {
			throw 'You must specify a Titanium SDK version and project path';
		}
		var builderPath = '"' + path.join(__self.paths.titanium, options.sdk, 'mobileweb', 'builder.py') + '"';
	    exec(constants.PYTHON + ' ' + builderPath + ' "' + options.path + '" run', function(err, stdout, stderr) {
	    	if (err) {
	    		logger.error('Failed to build mobileweb project');
		    	logger.error(err); 
	    	} else {
	    		logger.debug('Mobileweb project has been built');
	    	}
    		callback(err);
    	});
	} catch (e) {
		logger.error('Failed to build mobileweb project');
		logger.error(e);
		callback(e);
	}
};

var titaniumRun = function(options, tiapp, runCallback) {
	try {
		var buildPath = path.join(options.path, 'build', 'mobileweb');
		options.mobileWebPort = options.mobileWebPort || WEBSERVER_PORT;

		// build and run
		async.series([
			// build mobileweb project, if necessary
			function(callback) {
				if (options.nobuild) {
					callback();
				} else {
					titaniumBuild(options, tiapp, callback);
				}
			},
			// run mobileweb on local webserver
			function(callback) {
				// open a web server for mobile preview
				logger.debug('Creating mobileweb preview server');
			    var server = http.createServer(function(request, response) {
					var uri = url.parse(request.url).pathname,
					  	filename = path.join(buildPath, uri);

					fs.exists(filename, function(exists) {
						if(!exists) {
					  		response.writeHead(404, {"Content-Type": "text/plain"});
					  		response.write("404 Not Found\n");
					  		response.end();
					  		return;
						}

						if (fs.statSync(filename).isDirectory()) filename += '/index.html';

						fs.readFile(filename, "binary", function(err, file) {
					  		if(err) {        
					    		response.writeHead(500, {"Content-Type": "text/plain"});
					    		response.write(err + "\n");
					    		response.end();
					    		return;
					  		}

					  		response.writeHead(200);
					  		response.write(file, "binary");
					  		response.end();
						});
					});
			    });

			    // ignore it if the port is already open
			    server.on('error', function(e) {
			        if (e.code !== 'EADDRINUSE') {
			            logger.error(e);
			            callback(e);
			            return;
			        } else {
			            logger.warn('Port ' + options.mobileWebPort + ' is already in use.');
			            logger.warn('If your app isn\'t running in the browser, another application may be using the port.');
			            logger.warn('Specify a different port with the \'-m, --mobileWebPort\' option, or close the application using the port.');
			        }
			    });

			    logger.debug('Mobileweb preview server running at localhost:' + options.mobileWebPort);
			    server.listen(options.mobileWebPort);

			    // open the default browser
			    // TODO: is there a way to find the default browser on windows?
			    var openCmd = 'open';
			    if (process.platform === 'win32') {
			        openCmd = 'explorer.exe';
			    } else if (process.platform === 'linux') {
			        openCmd = 'xdg-open';
			    }

			    logger.debug('Opening default browser for mobileweb preview');
			    var browser = spawn(openCmd, ['http://localhost:' + options.mobileWebPort]);
			    browser.on('exit', function(code) {
			        logger.debug('Mobileweb application is now running in the default browser');
			        callback();
			    });
			}
		],
		function(err, result) {
			runCallback(err);
		});
	} catch (e) {
		logger.error('Failed to run mobileweb project');
		logger.error(e);
		runCallback(e);
	}
};

var titaniumDeploy = function(options, tiapp, deployCallback) {
	var buildPath = '"' + path.join(options.path, 'build', 'mobileweb') + '"';

	// Validate the deployment webroot
	if (!options.webroot) {
		logger.error('No webroot specified for mobileweb deployment');
		deployCallback(true);
		return;
	} else if (!path.existsSync(options.webroot)) {
		logger.error('Webroot "' + options.webroot + '" does not exist');
		deployCallback(true);
		return;
	}
	options.webroot = '"' + options.webroot + '"';

	// build and deploy
	async.series([
		// build mobileweb project, if necessary
		function(callback) {
			if (options.nobuild) {
				callback();
			} else {
				titaniumBuild(options, tiapp, function(err) {
		    		callback(err);
				});
			}
		},
		// deploy project to webroot
		function(callback) {
			try {
				var cmd = 'cp -rf ' + path.join(buildPath, '*') + ' ' + options.webroot; 
				if (process.platform === 'win32') {
					cmd = 'xcopy ' + buildPath + ' ' + options.webroot;
				}

	    		exec(cmd, function(err, stdout, stderr) {
	    			if (err) {
	    				logger.error('Failed to deploy mobileweb app to ' + options.webroot);
	    				logger.error(err); 
	    			} else {
	    				logger.debug('Mobileweb app deployed to ' + options.webroot); 
	    			}
	    			callback(err);
	    		});
	    	} catch (e) {
	    		logger.error('Failed to deploy mobileweb app to ' + options.webroot);
	    		logger.error(e);
	    		callback(e);
    		}
		}
	], 
	function(err, result) {
		deployCallback(err);
	});
};