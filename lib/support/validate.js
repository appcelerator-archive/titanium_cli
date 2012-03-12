var support = require('../support');

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