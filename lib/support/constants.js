module.exports = {
	TITANIUM_COMMANDS:['clean', 'configure', 'create', 'deploy', 'run'],
	TITANIUM_TARGETS: ['ios', 'android', 'mobileweb'],
	SDK_ROOT_PATH_LINUX:"~/.titanium/",
	SDK_ROOT_PATH_WIN32:"%APPDATA%\\Titanium\\",
	SDK_ROOT_PATH_MACOSX:"/Library/Application Support/Titanium/",
	SDK_ROOT_PATH_MACOSX_ALT:"~/Library/Application Support/Titanium/",
	CREATE_TARGETS: ['ios', 'android', 'mobileweb'],
	CREATE_TYPES: ['project', 'module', 'plugin'],
	RUN_TARGETS: ['iphone', 'retina', 'ipad', 'android', 'mobileweb', 'blackberry'],
	RUN_DARWIN_TARGETS: ['iphone', 'retina', 'ipad', 'android', 'mobileweb'],
	RUN_LINUX_TARGETS: ['android', 'mobileweb', 'blackberry'],
	RUN_WIN32_TARGETS: ['android', 'mobileweb', 'blackberry']
};
