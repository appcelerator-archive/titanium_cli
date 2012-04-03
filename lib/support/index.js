var colors = require('colors'),
	pd = require('pretty-data').pd;

/******************************************
 * Private Vars
 *****************************************/
var cwd = process.cwd();

/******************************************
 * Private methods
 *****************************************/
function debug(text) {
    console.log(('[DEBUG] ' + text).blue);
}
exports.debug = debug;

function info(text) {
    console.log(('[INFO]  ' + text));
}
exports.info = info;

function warn(text) {
    console.log(('[WARN]  ' + text).yellow);
}
exports.warn = warn;

function error(text) {
    console.log(('[ERROR] ' + text).red);
}
exports.error = error;

function die(text) {
	if (text) {
		error(text);
	}
	process.exit();
}
exports.die = die;

// detect the lines log level and color acording
exports.colorizeConsole = function(text, verbose) {
	if(text.indexOf('[DEBUG]') !== -1) {
        if(verbose) debug(text);
    }
	else if(text.indexOf('[WARNING]') !== -1) {
        warn(text);
    }
	else if(text.indexOf('[ERROR]') !== -1) {
        error(text);
    }
	else {
		info(text);
	}
};

function printObject(obj) {
	return pd.json(JSON.stringify(obj));
}
exports.printObject = printObject;

//Implement a custom logger which controls verbose or not verbose logging
function Logger(verbose) {
	this.verbose = verbose;
}
Logger.prototype = {
	info: info,
	warn: warn,
	error: error,
	die: die,
	debug: function(text) {
		if (this.verbose) {
			debug(text);
		}
	}
};
exports.Logger = Logger;

//Debug function for commands to check what data they're being given
exports.echo = function(config, args) {
	console.log('Configuration Data:');
	for (var opt in config) {
		console.log(opt+': '+config[opt]);
	}
	console.log('\n');

	console.log('Arguments:');
	for (var flag in args) {
		console.log(flag+': '+args[flag]);
	}
};

//print a header with dashes underneath- good for command names
exports.printHeader = function(text) {
	var buf = ['\n'+text+'\n'];
	for (var i = 0; i < text.length; i++) {
		buf.push('-');
	}
	console.log(buf.join('').magenta);
};

//print a title and a description with aligned spacing
exports.printAligned = function(title, text, bufferSize) {
	var buf = ['  ' + title];
	bufferSize = bufferSize || 18;
	for (var i = 0; i < (bufferSize - title.length); i++) {
		buf.push(' ');
	}
	buf.push(text);
	console.log(buf.join(''));
};

//print command doc in a standard format
exports.printDoc = function(args) {
	exports.printHeader(args.command);
	console.log('\n'+args.description);
	console.log('\nUsage:');
	console.log('  '+args.usage+'\n');
	console.log('Options:');
	args.options.forEach(function(arg) {
		exports.printAligned(arg[0] || '', arg[1] || '', 40);
	});
};