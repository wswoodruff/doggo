'use strict';

const Joi = require('joi');
const Cryptiles = require('cryptiles');

const Schema = require('./schema');

const internals = {};

module.exports = (adapter, config) => {

    Joi.assert(config, Schema.config, 'Bad config passed to doggo');
    Joi.assert(adapter, Schema.adapter, `Adapter doesn't match Schema.adapter: \n${adapter}`);

    return internals.getApi(adapter, config);
};

internals.getApi = (adapter, config) => {

    const extras = {};

    // Helpers
    extras.genPassword = () => {

        // Remove hyphens so all passwords can be double clicked for copying
        return Cryptiles.randomString(44).replace(/-/g, '');
    };

    return Object.assign({}, adapter, extras);
};
