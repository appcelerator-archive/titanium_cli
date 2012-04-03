var fs = require('fs'),
    support = require('../support'),
    constants = require('./constants'),
    configure = require('../commands/configure'),
    xml2js = require('xml2js'),
    path = require('path'),
    wrench = require('wrench'),
    prompt = require('prompt'),
    cwd = process.cwd(),
    platform = process.platform;

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
    var thePath = null;
    var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

    if (platform === 'darwin') {
        var darwinPath = path.join(home, constants.SDK_ROOT_PATH_MACOSX);
        if (path.existsSync(darwinPath) || !path.existsSync(constants.SDK_ROOT_PATH_MACOSX)) {
            thePath = darwinPath;
        } else {
            thePath = constants.SDK_ROOT_PATH_MACOSX;
        }
    } else if (platform === 'linux') {
        thePath = constants.SDK_ROOT_PATH_LINUX;
    } else if (platform === 'win32') {
        thePath = constants.SDK_ROOT_PATH_WIN32;
    } else {
        support.die('Titanium is not supported on platform "' + platform + '"');
    }

    // Create the SDK root if it doesn't already exist
    if (thePath !== null && !path.existsSync(thePath)) {
        try {
            wrench.mkdirSyncRecursive(thePath, 0777);
        } catch (e) {
            support.error(e);
            support.die('Unable to create Titanium SDK root path at "' + thePath + '"');
        }
    }

    return thePath;
};

exports.getUserConfig = function(resume, callback) {
    resume = resume || false;
    var sdkRoot = exports.getSdkRoot();

    try {
        if (sdkRoot === null) { throw 'Titanium SDK root path does not exist.'; }
        var json = JSON.parse(fs.readFileSync(path.join(sdkRoot,constants.TITANIUM_CONFIG_FILE), 'ascii'));

        if (callback) {
            callback(json);
        } else {
            return json;
        }
    } catch (e) {
        if (resume) {
            return null;
        } else {
            if (callback) {
                prompt.start();
                prompt.get([
                    {
                        message: "Your Titanium environment is not configured. Would you like to do it now? [y/N]",
                        name: "doConfigure"
                    }
                ], 
                function(err, result) {
                    if (err) { support.error('Titanium environment is not configured. You must run `titanium configure`.'); }
                    if (/y/i.test(result.doConfigure)) {
                        configure.execute([],{},new support.Logger(false), function(err2) {
                            if (err2) { support.die(err2); }
                            exports.getUserConfig(resume, callback);
                        });
                    } else {
                        support.error(e);
                        support.die('Titanium environment is not configured. You must run `titanium configure`.');
                    }
                });
            } else {
                support.error(e);
                support.die('Titanium environment is not configured. You must run `titanium configure`.');
            }
        }
    }
};