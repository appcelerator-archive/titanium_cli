var logger;

exports.doc = {
	command: 'titanium update', 
	description: 'Update/install your Titanium SDKs', 
	usage: 'titanium update [OPTIONS]'
};

exports.getOptions = function() {
	return [
		['', 'Also search '],
		['-v, --verbose', 'Verbose logging output']
	];
};

//execute the command - will be passed the global configuration 
//object and the command line arguments passed in
exports.execute = function(args, options, _logger) {
	logger = _logger;
	logger.error('Command "update" not yet implemented.');
};