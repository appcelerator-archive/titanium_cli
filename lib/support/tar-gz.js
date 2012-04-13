var zlib = require('zlib'),
	tar = require('tar'),
	fs = require('fs');

exports.extract = function(archive, dest, callback) {
	var gzIn = fs.createReadStream(archive);
	dest = dest || process.cwd();
	
	gzIn.pipe(zlib.createUnzip()).pipe(
		tar.Extract({ path: dest })
	).on('error', function(err) {
		if (callback) {
			callback(err);
		} else {
			throw err;
		}
	}).on('end', function() {
		if (callback) {
			callback();
		}
	});	
};

