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

    api.genPassword = () => {

        // Prevent certain characters from being at the front
        return Cryptiles.randomString(44).replace(/^[-_]+/, '');
    };

    return Object.assign({}, adapter, api);
};
