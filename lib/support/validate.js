// TODO: Add a 'source command' and/or 'error message' parameter for 
//       these calls so the error messages can be more descriptive and
//       specific to the actuall command executed.

var support = require('../support'),
    fs = require('fs');

exports.contains = function(val, collection) {
	var isArray = Array.isArray(val);
	var arr = isArray ? val : [val];
	for (var i = 0; i < arr.length; i++) {
		var val = arr[i];
		if (collection.indexOf(val) !== -1) {
			if (!isArray) {
				return val;
			}
		} else {
			support.error('Invalid value "' + val + '". Must be one of the following: [' + collection.join(',') + ']');
			process.exit();
		}	
	}
	return arr;
};

exports.pathDoesNotExist = function(val) {
	try {
		fs.statSync(val);
		support.error('The path "' + val + '" already exists.');
		process.exit();
	} catch(e) { 
		return val;
	}
};

exports.pathDoesExist = function(val, returnVal) {
	try {
		fs.statSync(val);
		return returnVal || val;
	} catch(e) { 
		support.error('The path "' + val + '" does not exist.');
		process.exit();
	}
};

exports.reverseDomain = function(val) {
	if (val.match(/^[a-zA-Z]+[a-zA-z0-9_]*\.(?:[a-zA-Z]+[a-zA-z0-9_]*\.*)+$/)) {
		return val;
	} else {
		support.error('Invalid value "' + val + '". Must be in reverse domain format.');
		support.error('Details: http://developer.android.com/guide/topics/manifest/manifest-element.html#package');
		support.error('Examples:');
		support.error('    com.appcelerator.appname');
		support.error('    com.appcelerator.region123.appname');
		support.error('    com.domain_name.appname');
		process.exit();
	}
};