'use strict';

const Joi = require('joi');

const internals = {};

internals.keysList = Joi.array().items({
    primaryKey: Joi.string().required(),
    fingerprint: Joi.string().min(40).required(),
    id: Joi.string().required(),
    subKey: Joi.string().required()
}).required();

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
    }).unknown().required(),
    platform: Joi.object({
        readDir: Joi.func().required(),
        getAdapter: Joi.func().required()
    }).required(),
    keysObj: Joi.object({
        pub: internals.keysList,
        sec: internals.keysList
    }).required(),
    keysList: internals.keysList
};
