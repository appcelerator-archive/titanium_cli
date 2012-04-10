/******************************************
 * Modules included in this package
 *****************************************/
var fs = require('fs'),
    support = require('../support'),
    colors = require('colors'),
    config = require('./config'),
    exec = require('child_process').exec,
    path = require('path'),
    ProgressBar = require('progress');

/******************************************
 * Private Vars
 *****************************************/
var cwd = process.cwd();

/******************************************
 * Private Methods
 *****************************************/
exports.getMaxVersion = function() {
    var conf = config.getUserConfig(true);
    if (!conf) {
        return null;
    }

    var files = fs.readdirSync(conf.mobileSdkRoot);
    var dirs_in = [];
    function sep(element, index, array) {
        try
        {
            if( fs.statSync( path.join(conf.mobileSdkRoot, element, 'titanium.py') )) {
                dirs_in.push(element);
            }
        } catch(e) {}
    }
    files.forEach(sep);
    return dirs_in.sort().reverse()[0];
}

/******************************************
 * Public Methods
 *****************************************/
exports.exists = function(version) {
    try
    {
        var conf = config.getUserConfig(true);
        fs.statSync( path.join(conf.mobileSdkRoot, version));
        return true;
    }
    catch (e)
    {
        return false;
    }
};
