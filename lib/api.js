'use strict';

const Joi = require('joi');
const Cryptiles = require('cryptiles');

const Schema = require('./schema');

const internals = {};

module.exports = (adapter) => {

    Joi.assert(adapter, Schema.adapter, 'Invalid adapter passed to doggo');

    return internals.getApi(adapter);
};

internals.getApi = (adapter) => ({
    genPassword() {

        // Remove hyphens so all passwords can be double clicked for copying
        return Cryptiles.randomString(44).replace(/-/g, '');
    },
    ...adapter
});
