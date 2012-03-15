var support = require('../support'),
    config = require('../support/config');

exports.doc = {
	command: 'titanium deploy', 
	description: 'Deploy the application to a device for testing', 
	usage: 'titanium deploy [ios, android]'
};

exports.getOptions = function() {
	return [
		['-v, --verbose', 'Verbose logging output']
	];
};

//execute the command - will be passed the global configuration 
//object and the command line arguments passed in
exports.execute = function(args, options, logger) {
	var props = config.getConfig(false, true);
};