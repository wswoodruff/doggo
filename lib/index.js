'use strict';

const Joi = require('joi');
const Cryptiles = require('cryptiles');

const DoggoCore = require('doggo-core');

const internals = {};

module.exports = (adapter, config, platform) => {

    const api = internals.getApi(adapter, config, platform);
    return DoggoCore(adapter, api, config);
};

internals.getApi = (adapter, config, platform) => {

    const api = {};

    // Helpers
    api.genPassword = () => {

        // Remove hyphens so all passwords can be double clicked for copying
        return Cryptiles.randomString(44).replace(/-/g, '');
    };

    return Object.assign({}, adapter, api);
};
