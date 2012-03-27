module.exports = {
	// General titanium level constants
	TITANIUM_CONFIG_FILE: 'cli.json',
	TITANIUM_COMMANDS:['clean', 'configure', 'create', 'deploy', 'run'],
	TITANIUM_TARGETS: ['ios', 'android', 'mobileweb', 'blackberry'],

	// Constants for finding SDK installations
	SDK_ROOT_PATH_LINUX:"~/.titanium/",
	SDK_ROOT_PATH_WIN32:"%APPDATA%\\Titanium\\",
	SDK_ROOT_PATH_MACOSX:"/Library/Application Support/Titanium/",
	SDK_ROOT_PATH_MACOSX_ALT:"~/Library/Application Support/Titanium/",
	SDK_ROOT_SUFFIX: {
		darwin: 'mobilesdk/osx',
		win32:  'mobilesdk\\win32',
		linux:  'mobilesdk/linux'
	},
	IOS_SDK_PATH: 'Platforms/iPhoneSimulator.platform/Developer/SDKs',

	// command specific constants
	CREATE_TARGETS: ['ios', 'android', 'mobileweb'],
	CREATE_TYPES: ['project', 'module', 'plugin'],
	RUN_TARGETS: {
		all: ['iphone', 'retina', 'ipad', 'android', 'mobileweb', 'blackberry'],
		darwin: ['iphone', 'retina', 'ipad', 'android', 'mobileweb'],
		win32: ['android', 'mobileweb', 'blackberry'],
		linux: ['android', 'mobileweb', 'blackberry']
	}
};
