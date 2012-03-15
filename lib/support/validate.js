var support = require('../support'),
    fs = require('fs');

exports.contains = function(val, collection, invalidCallback) {
	var isArray = Array.isArray(val);
	var arr = isArray ? val : [val];
	for (var i = 0; i < arr.length; i++) {
		var val = arr[i];
		if (collection.indexOf(val) !== -1) {
			if (!isArray) {
				return val;
			}
		} else {
			if (invalidCallback) {
				return invalidCallback(val);
			} else {
				support.error('Invalid value "' + val + '". Must be one of the following: [' + collection.join(',') + ']');
				process.exit();
			}
		}	
	}
	return arr;
};

exports.pathDoesNotExist = function(val, invalidCallback) {
	try {
		fs.statSync(val);
		if (invalidCallback) {
			return invalidCallback(val);
		} else {
			support.error('The path "' + val + '" already exists.');
			process.exit();
		}
	} catch(e) { 
		return val;
	}
};

exports.pathDoesExist = function(val, invalidCallback) {
	try {
		fs.statSync(val);
		return val;
	} catch(e) { 
		if (invalidCallback) {
			return invalidCallback(val);
		} else {
			support.error('The path "' + val + '" does not exist.');
			process.exit();
		}
	}
};

exports.reverseDomain = function(val, invalidCallback) {
	if (val.match(/^[a-zA-Z]+[a-zA-z0-9_]*\.(?:[a-zA-Z]+[a-zA-z0-9_]*\.*)+$/)) {
		return val;
	} else {
		if (invalidCallback) {
			return invalidCallback(val);
		} else {
			support.error('Invalid value "' + val + '". Must be in reverse domain format.');
			support.error('Details: http://developer.android.com/guide/topics/manifest/manifest-element.html#package');
			support.error('Examples:');
			support.error('    com.appcelerator.appname');
			support.error('    com.appcelerator.region123.appname');
			support.error('    com.domain_name.appname');
			process.exit();
		}
	}
};