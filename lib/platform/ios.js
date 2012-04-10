var path = require('path'),
	logger,
	__self;

//############## MODULE INTERFACE ################//
function Ios(titaniumPath, _logger) {
	__self = this;
	logger = _logger;
};
module.exports = Ios;