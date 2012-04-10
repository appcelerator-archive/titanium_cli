var path = require('path'),
	logger,
	__self;

//############## MODULE INTERFACE ################//
function Ios(options) {
	__self = this;
	logger = options.logger;

	this.iosTarget = options.iosTarget;
	this.paths = {
		titanium: options.titaniumPath
	}

	this.titanium = {
		build: titaniumBuild,
		deploy: titaniumDeploy,
		run: titaniumRun
	}
};
module.exports = Ios;

var titaniumBuild = function(options, tiapp, callback) {
	logger.warn('build not yet implemented for ' + __self.iosTarget);
	callback();
};

var titaniumDeploy = function(options, tiapp, callback) {
	logger.warn('deploy not yet implemented for ' + __self.iosTarget);
	callback();
};

var titaniumRun = function(options, tiapp, callback) {
	logger.warn('run not yet implemented for ' + __self.iosTarget);
	callback();
};