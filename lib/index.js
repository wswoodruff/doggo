'use strict';

const Api = require('./api');

module.exports = (adapter, config) => ({ api: Api(adapter, config) });
