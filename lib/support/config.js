var fs = require('fs'),
    support = require('../support'),
    consta = require('./constants'),
    parser = require('xml2json'),
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
        props.projectRoot = getRoot(cwd);

        try {
            var xml = fs.readFileSync(props.projectRoot + '/tiapp.xml', 'ascii');
            props.tiapp = JSON.parse(parser.toJson(xml))['ti:app'];
            delete props.tiapp['xmlns:ti'];
        } catch(e) {
            support.error('[ERROR] No tiapp.xml file was found or the data in the file was corrupt');
            process.exit();
        }

        return props;
    } catch(e) {
        support.error('[ERROR] No config found on your system... please run `titanium config` then re-try your command');
        process.exit();
    }
};