'use strict';

// This file also serves as API documentation

const Joi = require('joi');

const internals = {};

module.exports = {
    adapter: Joi.object({
        name: Joi.string().required(),
        genKeys: Joi.func().required(),
        deleteKeys: Joi.func().required(),
        importKey: Joi.func().required(),
        exportKey: Joi.func().required(),
        listKeys: Joi.func().required(),
        encrypt: Joi.func().required(),
        decrypt: Joi.func().required(),
        genPassword: Joi.func(),
        keyExists: Joi.func(),
        getAdapterOptions: Joi.func(),
        execute: Joi.func(),
        utils: Joi.object().unknown()
    }).required().unknown(),
    // TODO
    // platform: Joi.object({
    //     readDir: Joi.func().required(),
    //     getAdapter: Joi.func().required()
    // }).required(),
    keysInfo: Joi.array().single().items({
        fingerprint: Joi.string().min(40).max(40).required(),
        identifier: Joi.string().required()
    }).required(),
    keys: Joi.array().single().items({
        fingerprint: Joi.string().min(40).max(40).required(),
        identifier: Joi.string().required(),
        // TODO look for some key lookin stuff like PGP headers or something
        pub: Joi.string().required(),
        sec: Joi.string().required()
    }).required()
};
