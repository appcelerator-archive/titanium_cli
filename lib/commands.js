/******************************************
 * Modules included in this package
 *****************************************/
var fs = require('fs'),
    terminal = require('./terminal'),
    exec = require('child_process').exec,
    path = require("path");

/******************************************
 * Private Vars
 *****************************************/
var cwd = process.cwd();

/******************************************
 * Private methods
 *****************************************/
function debug(text) {
    terminal.color('blue').write('[DEBUG] '+text+"\n");
}

function info(text) {
    terminal.color('green').write('[INFO] '+text+"\n");
}

function warning(text) {
    terminal.color('yellow').write('[WARNING] '+text+"\n");
}

function error(text) {
    terminal.color('red').write('[ERROR] '+text+"\n");
}

// detect the lines log level and color acording
function colorizeConsole(text) {

    if(text.indexOf('[DEBUG]') === 0) {

        terminal.color('blue').write(text);

    } else if(text.indexOf('[INFO]') === 0) {

        terminal.color('green').write(text);

    } else if(text.indexOf('[WARNING]') === 0) {

        terminal.color('yellow').write(text);

    } else if(text.indexOf('[ERROR]') === 0) {

        terminal.color('red').write(text);

    } else {

        console.log(text);

    }
}

function getRoot(url) {
    info(url + '/tiapp.xml');
    fs.stat(url + '/tiapp.xml', function(err, stat) {
        if(err !== null) {
            if(url === '/') {
                error("No project found at this locations");
                process.exit();
            } else {
                return getRoot(path.normalize(url+'/..'));
            }
        } else {
            return url;
        }
    });
}

/******************************************
 * Public Methods
 *****************************************/
exports.currentProjectRoot = function() {
    return getRoot(cwd);
};

runScript = function(cmd) {
    var child = exec("cmd");

    child.stdout.on('data', function (data) {

        if(data.indexOf("SystemExit: 65") != -1 ) {
            error('There was an error compialing your application, and Xcode did not provide the error. Please run your project directly from Xcode to see the error...');
        } else {
            colorizeConsole(data);
        }

    });

    child.stderr.on('data', function (data) {
      console.log(data);
    });

    child.on('exit', function (code) {
      return code;
    });
};

runScript('ls');

// public console output methods
exports.info = info;
exports.debug = debug;
exports.warning = warning;
exports.error = error;
