module.exports = {
	// General titanium level constants
	TITANIUM_CLI_VERSION: '0.1.0',
	TITANIUM_CONFIG_FILE: 'cli.json',
	TITANIUM_TARGETS: ['ios', 'android', 'mobileweb', 'blackberry'],
	TITANIUM_PLATFORMS: ['darwin', 'win32', 'linux'],
	TITANIUM_REQUIREMENTS: {
		IOS_VERSION: '4.0',
		ANDROID_VERSION: '2.2'
	},

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
	},
	RUN_AVD_PREFIX: 'titaniumcli',
	RUN_AVD_TARGET: 1,
	RUN_AVD_SKIN: 'HVGA',

	UPDATE_SERVERS: {
		CI: {
			options: {
				host: 'builds.appcelerator.com.s3.amazonaws.com',
				port: 80,
				path: '/mobile/master/index.json'
			},	
			rootPath: '/mobile/master/'
		},
		RELEASE: {
			options: {
				host: 'api.appcelerator.net',
				port: 80,
				path: '/p/v2/release-list?name=mobilesdk&v=1.0.7.v2011-foo'
			}
		}
	},
	UPDATE_OS_MAP: {
		darwin: 'osx',
		win32: 'win32',
		linux: 'linux'
	}
};
