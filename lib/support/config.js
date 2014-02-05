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
        if (fs.existsSync(darwinPath) || !fs.existsSync(constants.SDK_ROOT_PATH_MACOSX)) {
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
    if (thePath !== null && !fs.existsSync(thePath)) {
        try {
            wrench.mkdirSyncRecursive(thePath, 0777);
        } catch (e) {
            support.error(e);
            support.die('Unable to create Titanium SDK root path at "' + thePath + '"');
        }
    }

    return thePath;
};

exports.getUserConfig = function(resume) {
    resume = resume || false;
    var sdkRoot = exports.getSdkRoot();

    try {
        if (sdkRoot === null) { throw 'Unable to find Titanium SDK root path.'; } 
        var configFile = path.join(sdkRoot,constants.TITANIUM_CONFIG_FILE);
        if (!fs.existsSync(configFile)) { throw 'Unable to find Titanium configuration file at "' + configFile + '"'; }
        return JSON.parse(fs.readFileSync(configFile, 'ascii'));
    } catch (e) {
        if (resume) {
            return null;
        } else {
            support.error(e);
            support.error('Titanium environment is not configured or configuration file may be corrupt.');
            support.die('Try running `titanium configure`');
        }
    }
};