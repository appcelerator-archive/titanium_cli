var fs = require('fs'),
    support = require('../support'),
    consta = require('./constants'),
    platform = process.platform;

exports.getConfig = function() {
    if (platform === 'darwin') {
        try {
            fs.statSync(consta.SDK_ROOT_PATH_MACOSX);
            sdkRoot = consta.SDK_ROOT_PATH_MACOSX;
        } catch(e) {
            sdkRoot = consta.SDK_ROOT_PATH_MACOSX_ALT;
        }
    }

    if (platform === 'linux') {
        sdkRoot = consta.SDK_ROOT_PATH_LINUX;
    }

    if (platform === 'win32') {
        sdkRoot = consta.SDK_ROOT_PATH_WIN32;
    }

    try {
        var config = fs.readFileSync(sdkRoot + 'cli.json', 'ascii');

        var props = JSON.parse(config);
        //projectRoot = getRoot(cwd);

        return props;
    } catch(e) {
        support.error('[ERROR] No config found on your system... please run `titanium config` then re-try your command');
        process.exit();
    }
};