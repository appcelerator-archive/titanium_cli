var fs = require('fs'),
    support = require('../support'),
    constants = require('./constants'),
    xml2js = require('xml2js'),
    path = require('path'),
    wrench = require('wrench'),
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
        return JSON.parse(fs.readFileSync(path.join(sdkRoot,constants.TITANIUM_CONFIG_FILE), 'ascii'));
    } catch (e) {
        if (resume) {
            return null;
        } else {
            // TODO: If the command can't resume without the config, then try to run it now and use the 
            //       `callback` to return to the original command
            support.error(e);
            support.die('No config found on your system... please run `titanium configure` then re-try your command');
        }
    }
};