'use strict';

const Joi = require('joi');

const internals = {};

internals.keyListItem = Joi.array().items({
    fingerprint: Joi.string().min(40).max(40).required(),
    identifier: Joi.string().required(),
    primary: Joi.string().required(),
    sub: Joi.string().required()
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
    // TODO
    // platform: Joi.object({
    //     readDir: Joi.func().required(),
    //     getAdapter: Joi.func().required()
    // }).required(),
    keysObj: Joi.object({
        pub: internals.keyListItem,
        sec: internals.keyListItem
    }).required(),
    keyListItem: internals.keyListItem,
    listKeyBasicItem: Joi.object({
        fingerprint: Joi.string().min(40).max(40).required(),
        identifier: Joi.string().required()
    }).required()
};
