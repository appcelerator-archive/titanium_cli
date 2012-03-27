// TODO: Use the following URL to get CI builds: http://builds.appcelerator.com.s3.amazonaws.com/mobile/master/index.json
// TODO: Use pattern match to find appropriate CI build for OS
// TODO: Get URL for pulling down latest release builds

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

exports.execute = function(args, options, _logger) {
	logger = _logger;
	logger.error('Command "update" not yet implemented.');
};