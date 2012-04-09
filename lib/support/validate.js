var support = require('../support'),
	path = require('path'),
    fs = require('fs'),
    util = require('util');

// Make sure that 'val' is contained within the collection. If 'val'
// is an array, check all items in the array and make sure they 
// are all in 'collection'.
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
				support.die('Invalid value "' + val + '". Must be one of the following: [' + collection.join(',') + ']');
			}
		}	
	}
	return arr;
};

// Make sure a list of CLI platform targets are valid
exports.platformTargets = function(cliTargets, cmdTargets, tiapp) {
	var prefix = 'Platform target validation failed: ';
	var jsonTargets = tiapp['deployment-targets'].target;
    var tiappTargets = [];

    // get all targets from tiapp.xml
    jsonTargets.forEach(function(target) {
        if (target['#'] === 'true') {
            tiappTargets.push(target['@']['device']);
        }
    });

    // add retina as a target if any ios devices are included
    if (tiappTargets.has('iphone') || tiappTargets.has('ipad')) {
        tiappTargets.push('retina');
    }

    // Make sure all CLI targets are in the tiapp.xml
    if (!cliTargets || (cliTargets && cliTargets.length === 0)) {
    	cliTargets = intersection(tiappTargets, cmdTargets);
    } else {
    	cliTargets.forEach(function(target) {
	    	if (!exports.contains(target, tiappTargets)) {
	    		throw prefix + 'Target "' + target + '" not configured in this project\'s tiapp.xml file.';
	        } else if (!exports.contains(target, cmdTargets)) {
	        	throw prefix + 'Target "' + target + '" not valid for this titanium command.';
	        }
	    });
    }

    return cliTargets;
};

// Make sure the given filepath is a valid project path
exports.projectPath = function(filepath) {
	var prefix = 'Project path validation failed: ';
    if (!path.existsSync(filepath)) {
        throw prefix + '"' + filepath + '" does not exist';
    } else if (!path.existsSync(path.join(filepath,'tiapp.xml'))) {
        throw prefix + '"' + filepath + '" is not a valid Titanium project directory (no tiapp.xml)';
    }
    return path.resolve(filepath);
};

// Details: http://developer.android.com/guide/topics/manifest/manifest-element.html#package
// Examples:
// 		com.appcelerator.appname
// 		com.appcelerator.region123.appname
// 		com.domain_name.appname
exports.reverseDomain = function(val, invalidCallback) {
	return val.match(/^[a-zA-Z]+[a-zA-z0-9_]*\.(?:[a-zA-Z]+[a-zA-z0-9_]*\.*)+$/); 
};

//################# HELPERS ####################//

var intersection = function(arr1, arr2) {
	var arr = [];
	if (util.isArray(arr1) && util.isArray(arr2)) {
		arr1.forEach(function(item1) {
			arr2.forEach(function(item2) {
				if (item1 === item2) {
					arr.push(item1);
				}
			});
		});
	}
	return arr;
};