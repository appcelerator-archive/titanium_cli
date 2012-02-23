var ti = require('./commands'),
	fs = require('fs'),
	exec = require('child_process').exec,
	conf = require('./configure');

function cleanAndroid() {
	exec("rm -rf '"+conf.props.projectRoot+"/build/android/'");
	setTimeout(function() {
		exec("mkdir -p '"+conf.props.projectRoot+"/build/android/'");
	}, 30);
}

function cleaniOS() {
	exec("rm -rf '"+conf.props.projectRoot+"/build/iphone/'");
	setTimeout(function() {
		exec("mkdir -p '"+conf.props.projectRoot+"/build/iphone/'");
	}, 30);
}

exports.execute = function(env) {
	switch(env.ignore) {
		case 'iphone':
			cleanAndroid();
			break;

		case 'android':
			cleaniOS();
			break;

		default:
			cleaniOS();
			cleanAndroid();
			break;
		}
};
