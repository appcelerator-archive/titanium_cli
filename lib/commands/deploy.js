var logger;

exports.doc = {
	command: 'titanium deploy', 
	description: 'Deploy the application to a device for testing', 
	usage: 'titanium deploy [ios,android] [OPTIONS]',
	options: [],
	needsConfig: true
};

//execute the command - will be passed the global configuration 
//object and the command line arguments passed in
exports.execute = function(args, options, _logger) {
	logger = _logger;
	logger.error('Command "deploy" not yet implemented.');
};