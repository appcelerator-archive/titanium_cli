# Titanium CLI

A [node.js](http://nodejs.org) based command line interface for Titanium Mobile.  Not a replacement for Studio IDE, but a driver for non-Studio users and usable interface for continuous integration.  Laser focus on easy setup and use. Hit us up on [the twitter](http://twitter.com/appcelerator) or at community at appcelerator dot com with questions.

# Usage

## Install

* [Install a binary distribution of node.js](http://nodejs.org/#download)
* `npm install -g titanium`
* `titanium configure`

## Docs

Run `titanium` with no arguments for a list of commands.  Run `titanium help [command]` for help on a specific command.

# Contributing

Contributors to this project are required to sign Appcelerator's standard [contributor license agreement](http://developer.appcelerator.com/cla).  Once that's taken care of, pull requests will be processed with extreme prejudice.

## Setup

Install all dependencies for the CLI by running `npm install` at the top level project directory.  Dependencies should all be declared in `package.json`.

## Adding a new built-in command

* Add a file by the name of your command to the `lib/commands` directory
* Require that file into the commands object created in `lib/commands/index.js` - this is required by the main CLI script
* Implement a command module with the following interface:

		exports.doc = {
			command: 'titanium clean',  //your command 
			description: 'Clean the project build directories', //description of what your command does
			usage: 'titanium clean [ios, android]', //sample usage
			options: {  //options
				'-v, --verbose': 'Verbose logging output',
				'-p, --path': 'Project path to clean - defaults to current working directory'
			}
		};

		exports.execute = function(args,logger) {
			//execute your command.  The main driver script will call your function with:
		
			//args: the command line arguments passed to the script.  Examples:
			//titanium run iphone >>> ['iphone']
			//titanium run iphone -v >>> ['iphone', 'v']
			//titanium create MyApp --verbose >>> ['MyApp', 'verbose']
			//titanium create MyApp -d /Users/kevin -v --sdk /dev/ti-1.6 >>> ['MyApp', {d:'/Users/kevin'}, 'v', {sdk:'/dev/ti-1.6'}]
				
			//logger - a logging object which prints colorized log messages and will skip debug messages if -v is not present. Usage:
			//logger.info('regular text');
			//logger.error('red scary text');
			//logger.warn('yellow warning text');
			//logger.debug('blue text you only see when -v or --verbose is passed in');	
		};
	
## Adding an extension command

Coming soon.  Should be installable as an npm module.

## Testing

Tests for the Titanium CLI are implemented with [nodeunit](https://github.com/caolan/nodeunit).  If you submit a command, be a lamb and write a test or two to make sure it works in the `tests` directory.  This file should be named the same as your command.  To run/contribute tests:

* `npm install -g nodeunit`
* `touch tests/[command name].js`
* Implement tests per [the documentation here](https://github.com/caolan/nodeunit)
* Run test suite with `nodeunit tests`

## Installing your local version of the binary

Run `npm install -g .` at the top level directory to have npm install the `titanium` binary command on your system path.