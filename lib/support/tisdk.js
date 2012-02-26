/******************************************
 * Modules included in this package
 *****************************************/
var fs = require('fs'),
    p = require('commander'),
    terminal = require('./terminal'),
    exec = require('child_process').exec,
    ProgressBar = require('progress');

/******************************************
 * Private Vars
 *****************************************/
var cwd = process.cwd();

/******************************************
 * Public Methods
 *****************************************/
exports.runScript = function(cmd) {
    var child = exec(cmd),
        verbose = true,
        iv,
        progress = 0,
        bar,
        error = false,
        booted = false;

    function startProgress() {
        bar = new ProgressBar('Rebuilding progress: [:bar] :percent', { total: 20 });
        iv = setInterval(function () {
            if(progress < 19 && !error) {
                progress = progress+1;
                bar.tick();
            }

            if (booted || error) {

                // We setTimeout to give time for the error buffer to clear...
                setTimeout(function() {
                    process.exit();
                }, 300);
                clearInterval(iv);
            }
        }, 400);
    }

    child.stdout.on('data', function (data) {

        lines = data.split(/\r\n|\r|\n/);

        for(i=0; i<lines.length; i++) {

            if(lines[i] !== '') {

                if(lines[i].indexOf("SystemExit: 65") != -1 ) {
                    clearInterval(iv);
                    console.log("\n");
                    error('There was an error compialing your application, and Xcode did not provide the full error. Please run your project directly from Xcode to see the error...');
                } else if(lines[i].indexOf("processing") != -1 || lines[i].indexOf("linking") != -1 || lines[i].indexOf("Performing full rebuild") != -1) {
                    if(bar === undefined && iv === undefined && p.verbose === undefined) {
                        verbose = false;
                        startProgress();
                    } else if(verbose === true) {
                        colorizeConsole(lines[i]);
                        console.log("");
                    }

                } else if(lines[i].indexOf("application booted") != -1 ) {
                    booted = true;
                    if(bar !== undefined) {
                        bar.tick(20 - p);
                        console.log("\n");
                        colorizeConsole(lines[i]);
                        console.log("");
                    }
                } else {
                    if( verbose || booted ) colorizeConsole(lines[i]);
                }

            }
        }

    });

    child.stderr.on('data', function (data) {
        error = true;

        console.log("");
        terminal.color('red').write(data);
    });

    child.on('exit', function (code) {
      return code;
    });
};

// public console output methods
exports.info = info;
exports.debug = debug;
exports.warning = warning;
exports.error = error;
