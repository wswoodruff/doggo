'use strict';

const Joi = require('joi');

const internals = {};

internals.keysList = Joi.array().items({
    primaryKey: Joi.string().required(),
    fingerprint: Joi.string().min(40).required(),
    id: Joi.string().required(),
    subKey: Joi.string().required()
});

module.exports = {
    config: Joi.object({
        silent: Joi.boolean()
    }),
    adapter: Joi.object({
        genKeys: Joi.func().required(),
        deleteKeys: Joi.func().required(),
        importKey: Joi.func().required(),
        exportKey: Joi.func().required(),
        listKeys: Joi.func().required(),
        encrypt: Joi.func().required(),
        decrypt: Joi.func().required(),
        genPassword: Joi.func(),
        keyExists: Joi.func(),
        getAdapterArgs: Joi.func(),
        execute: Joi.func(),
        utils: Joi.object({
            firstKeyFromList: Joi.func(),
            keysForIdentifier: Joi.func(),
            firstKeyForIdentifier: Joi.func()
        })
    }).unknown(),
    platform: Joi.object({
        readDir: Joi.func().required(),
        getAdapter: Joi.func().required()
    }),
    keysObj: Joi.object({
        pub: internals.keysList,
        sec: internals.keysList
    }),
    keysList: internals.keysList
};
