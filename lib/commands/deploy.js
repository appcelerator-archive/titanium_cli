var support = require('../support');

exports.doc = {
	command: 'titanium deploy', 
	description: 'Deploy the application to a device for testing', 
	usage: 'titanium deploy [ios, android]', 
	options: [
		['-v, --verbose', 'Verbose logging output']
	]
};

exports.description = 'Deploy the application to a device for testing';
exports.help = function() {
	support.printHeader('titanium deploy');
	console.log('');
	support.printAligned('Usage', 'titanium deploy [ios, android]');
	console.log('\nOptions:');
	support.printAligned('-v, --verbose', 'Verbose logging output');
};

//execute the command - will be passed the global configuration 
//object and the command line arguments passed in
exports.execute = function(args, options, logger) {
	support.echo(config,args);
};