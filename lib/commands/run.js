var config = require('../support/config'),
    validate = require('../support/validate'),
    constants = require('../support/constants'),
    tisdk = require('../support/tisdk'),
    http = require('http'),
    path = require('path'),
    fs = require('fs'),
    url = require('url'),
    execSync = require('exec-sync'),
    spawn = require('child_process').spawn,
    MOBILEWEB_PORT = 2222,
    logger,
    userConf;

exports.doc = {
    command: 'titanium run', 
    description: 'Run a project on a device sim/emulator', 
    usage: 'titanium run [iphone,retina,ipad,android,mobileweb,blackberry] [OPTIONS]',
    options: [
        ['-a, --androidVersion <androidVersion>', 'Android SDK version'],
        ['-i, --iosVersion <iosVersion>', 'iOS SDK version'],
        ['-p, --path <path>', 'Project path'],
        ['-s, --sdk <sdk>', 'Titanium SDK version'],
        ['-v, --verbose', 'Verbose logging output']
    ]
};

var conf = {};
var verbose = false;

Array.prototype.has=function(v){
    for (i=0;i<this.length;i++){
    if (this[i]==v) return true;
    }
    return false;
};

function runMobileWeb(tiapp, options) {
    var webroot = path.join(options.path, 'build', 'mobileweb');
    execSync("'"+path.join(userConf.mobileSdkRoot, options.sdk, 'mobileweb', 'builder.py')+"' '"+options.path+"' run");

    // open a web server for mobile preview
    var server = http.createServer(function(request, response) {
      var uri = url.parse(request.url).pathname,
          filename = path.join(webroot, uri);
      
      path.exists(filename, function(exists) {
        if(!exists) {
          response.writeHead(404, {"Content-Type": "text/plain"});
          response.write("404 Not Found\n");
          response.end();
          return;
        }

        if (fs.statSync(filename).isDirectory()) filename += '/index.html';

        fs.readFile(filename, "binary", function(err, file) {
          if(err) {        
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write(err + "\n");
            response.end();
            return;
          }

          response.writeHead(200);
          response.write(file, "binary");
          response.end();
        });
      });
    });

    // ignore it if the port is already open
    // TODO: can we assert that the webserver is actually running if the 
    //       port is in use?
    server.on('error', function(e) {
        if (e.code !== 'EADDRINUSE') {
            logger.die(e);
        }
    });
    server.listen(MOBILEWEB_PORT);

    // open the default browser
    // TODO: is there a way to find the default browser on windows?
    var openCmd = 'open';
    if (process.platform === 'win32') {
        openCmd = 'explorer.exe';
    } else if (process.platform === 'linux') {
        openCmd = 'xdg-open';
    }
    spawn(openCmd, ['http://localhost:' + MOBILEWEB_PORT]);
}

function runAndroid(tiapp, options) {
    var sdkVersionRoot = path.join(userConf.mobileSdkRoot, options.sdk, 'android');
    var androidPath = userConf.androidSDKPath;
    options.androidVersion = options.androidVersion || constants.RUN_ANDROID_VERSION_DEFAULT;

    // TODO: Kill existing android emulator if androidVersion doesn't match existing emulator
    // TODO: Can this be done with one command?
    // TODO: Allow user to specify AVD skin
    tisdk.runScript("'"+path.join(sdkVersionRoot, 'builder.py')+"' emulator '"+tiapp.name+"' '"+androidPath+"' '"+options.path+"' '"+tiapp.id+"' "+options.androidVersion+" HVGA", options.verbose);
    tisdk.runScript("'"+path.join(sdkVersionRoot, 'builder.py')+"' run '" + options.path + "' '"+androidPath+"'", options.verbose);
    tisdk.runScript("'"+path.join(androidPath, 'platform-tools', 'adb')+"' logcat | grep Ti");
}

function runIos(tiapp, options, iosPlatform) {
    // get ios versions
    var sdkVersionRoot = path.join(userConf.mobileSdkRoot, options.sdk, 'iphone');
    var cmd = "'" + path.join(sdkVersionRoot, 'prereq.py') + "' project";
    var iosSDKS = tisdk.returnScript(cmd).sdks;

    // Make sure we have an iOS SDK installed
    if (iosSDKS.length === 0) {
        logger.die('No iOS SDKs installed');
    }

    // Make sure the chosen SDK is installed
    if (options.iosVersion) {
        validate.contains(options.iosVersion, iosSDKS, function(val) {
            logger.die('iOS SDK "' + options.iosVersion + '" not installed. You have the following version installed: [' + iosSDKS.join(',') + ']');
        });
    } else {
        options.iosVersion = iosSDKS[0];
    }

    // Run the project in the iOS simulator
    cmd = "'"+path.join(sdkVersionRoot, 'builder.py')+"' simulator "+options.iosVersion+" '"+options.path+"' '"+tiapp.id+"' '"+tiapp.name+"' " + iosPlatform;
    tisdk.runScript(cmd, true);
};

exports.execute = function(args, options, _logger) {
    logger = _logger;
    userConf = config.getUserConfig(false);

    // Validate project path
    options.path = options.path || process.cwd();
    if (!path.existsSync(options.path)) {
        logger.die('"' + options.path + '" does not exist');
    } else if (!path.existsSync(path.join(options.path,'tiapp.xml'))) {
        logger.die('"' + options.path + '" is not a valid Titanium project directory (no tiapp.xml)');
    }
    options.path = path.resolve(options.path);

    // Get values from tiapp.xml
    config.getTiappXml(path.join(options.path,'tiapp.xml'), function(result) {
        var tiapp = result,
            target,
            targets = [];

        // Validate Titanium SDK version
        options.sdk = options.sdk || tiapp['sdk-version'];
        if (!tisdk.exists(options.sdk)) {
            logger.die('Titanium SDK version "' + options.sdk + '" not found');
        }

        // Get targets from the CLI
        var cliTarget = args.shift();
        var cliTargets = [];
        if (cliTarget) {
            cliTargets = validate.contains(cliTarget.split(','), constants.RUN_TARGETS[process.platform]);
        } else {
            cliTargets = constants.RUN_TARGETS[process.platform];
        }

        // Get targets from the tiapp.xml
        var jsonTargets = tiapp['deployment-targets'].target;
        var tiappTargets = [];
        for (var i = 0; i < jsonTargets.length; i++) {
            target = jsonTargets[i];
            if (target['#'] === 'true') {
                tiappTargets.push(target['@']['device']);
            }
        }

        if (tiappTargets.has('iphone') || tiappTargets.has('ipad')) {
            tiappTargets.push('retina');
        }

        // Confirm that all CLI targets are supported by the tiapp.xml targets.
        // We also need to make sure the targets are supported by the OS.
        for (var i = 0; i < cliTargets.length; i++) {
            target = cliTargets[i];
            if (!tiappTargets.has(target)) {
                logger.error('Target "' + target + '" not configured in this project\'s tiapp.xml file.');
                process.exit();
            } 
        }

        // OK, we've verified the list of targets. Let's run.
        var didIos = false;
        for (var i = 0; i < cliTargets.length; i++) {
            target = cliTargets[i];
            switch(target) {
                case 'iphone':
                case 'ipad':
                case 'retina':
                    if (!didIos) {
                        didIos = true;
                        runIos(tiapp, options, target === 'retina' ? 'iphone retina' : target);
                    }
                    break;
                case 'android':
                    runAndroid(tiapp, options);
                    break;
                case 'mobileweb':
                    runMobileWeb(tiapp, options);
                    break;
                default:
                    logger.error('Run target "' + target + '" is not yet implemented.');
                    break;
            }
        }
    });
};

