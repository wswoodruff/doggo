'use strict';

const Api = require('./api');
const Package = require('../package.json');

module.exports = (adapter, options) => ({
    api: Api(adapter, options),
    version: Package.version
});
