var support = require('../support'),
    fs = require('fs');

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

// Details: http://developer.android.com/guide/topics/manifest/manifest-element.html#package
// Examples:
// 		com.appcelerator.appname
// 		com.appcelerator.region123.appname
// 		com.domain_name.appname
exports.reverseDomain = function(val, invalidCallback) {
	return val.match(/^[a-zA-Z]+[a-zA-z0-9_]*\.(?:[a-zA-Z]+[a-zA-z0-9_]*\.*)+$/); 
};