var fs = require('fs'),
    support = require('../support'),
    consta = require('./constants'),
    xml2js = require('xml2js'),
    path = require('path'),
    cwd = process.cwd(),
    platform = process.platform;

function getRoot(url) {
    try
    {
        fs.statSync(url + '/tiapp.xml');
        return url;
    }
    catch (e)
    {
        if(url === '/') {
            ti.error("No project found at this locations");
            process.exit();
        } else {
            return getRoot(path.normalize(url+'/..'));
        }
    }
}

exports.getTiappXml = function(pathToTiapp, callback) {
    var parser = new xml2js.Parser();
    if (typeof pathToTiapp == 'function') {
        callback = pathToTiapp;
        pathToTiapp = path.join(process.cwd(), 'tiapp.xml');
    }
    fs.readFile(pathToTiapp, function(err, data) {
        parser.parseString(data, function (err, result) {
            callback(result);
        });
    });
}

exports.getSdkRoot = function() {
    var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    if (platform === 'darwin') {
        try {
            fs.statSync(home + consta.SDK_ROOT_PATH_MACOSX);
            return home + consta.SDK_ROOT_PATH_MACOSX;
        } catch(e) {
            try {
                fs.statSync(consta.SDK_ROOT_PATH_MACOSX);
                return consta.SDK_ROOT_PATH_MACOSX;
            } catch(ex) {
                support.error('Unable to find Titanium SDK. Make sure you have it installed.');
                process.exit();
            }
        }
    } else if (platform === 'linux') {
        return consta.SDK_ROOT_PATH_LINUX;
    } else if (platform === 'win32') {
        return consta.SDK_ROOT_PATH_WIN32;
    } else {
        support.error('Unsupported platform: "' + platform + '"');
        process.exit();
    }
};

exports.getUserConfig = function(resume) {
    resume = resume || false;
    var sdkRoot = exports.getSdkRoot();

    try {
        var jsonText = fs.readFileSync(sdkRoot + 'cli.json', 'ascii');
        return JSON.parse(jsonText);
    } catch (e) {
        if (resume) {
            return null;
        } else {
            support.debug(e);
            support.error('No config found on your system... please run `titanium configure` then re-try your command');
            process.exit();
        }
    }
};

exports.getConfig = function(_resume, _excludeTiapp, callback) {
	// allow the calling module to determine if the process should exit or not.
	_resume = _resume || false;
	
	// don't attempt to pull tiapp.xml attributes if you don't need to
	_excludeTiapp = _excludeTiapp || false;
	
    // find the sdk path
    var sdkRoot = exports.getSdkRoot();

    try {
        var config = fs.readFileSync(sdkRoot + 'cli.json', 'ascii');
        var props = JSON.parse(config);

		if (_excludeTiapp === false) {
        	props.projectRoot = getRoot(cwd);
        	try {
                var parser = new xml2js.Parser();
                fs.readFile(props.projectRoot + '/tiapp.xml', function(err, data) {
                    parser.parseString(data, function (err, result) {
                        props.tiapp = result;
                        if (callback) {
                            callback(props);
                        }
                    });
                });


	            //var xml = fs.readFileSync(props.projectRoot + '/tiapp.xml', 'ascii');
	            //TODO parse xmlo and load into properties
	            //props.tiapp = JSON.parse(parser.toJson(xml))['ti:app'];
                //delete props.tiapp['xmlns:ti'];
	        } catch(e) {
	        	if (_resume) {
	        		return props;
	        	} else {
                    //support.debug(e);
		            support.error('No tiapp.xml file was found or the data in the file was corrupt');
		            process.exit();
		    	}
	        }
		}

        return props;
    } catch(e) {
        //console.log(e);
    	if (_resume) {
    		return null;
    	} else {
            //support.debug(e);
	        support.error('No config found on your system... please run `titanium configure` then re-try your command');
	        process.exit();
	    }
    }
};