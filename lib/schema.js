'use strict';

// This file also serves as API documentation

const Joi = require('joi');

const internals = {};

internals.fingerprint = Joi.string().min(40).max(40);

internals.keysInfo = Joi.array().single().items({
    fingerprint: internals.fingerprint.required(),
    identifier: Joi.string().required()
}).required();

internals.keys = Joi.array().single().items({
    fingerprint: internals.fingerprint.required(),
    identifier: Joi.string().required(),
    // TODO look for some PGP headers or something
    pub: Joi.string().required().allow(null),
    sec: Joi.string().required().allow(null)
}).required();

internals.allPubOrSec = Joi.string().valid('all', 'pub', 'sec');

module.exports = {
    adapter: Joi.object({
        name: Joi.string().required(),
        genKeys: Joi.func().required(),
        deleteKey: Joi.func().required(),
        importKey: Joi.func().required(),
        exportKeys: Joi.func().required(),
        listKeys: Joi.func().required(),
        encrypt: Joi.func().required(),
        decrypt: Joi.func().required(),
        genPassword: Joi.func(),
        utils: Joi.object()
    }).required().unknown(),
    // TODO
    // platform: Joi.object({
    //     readDir: Joi.func().required(),
    //     getAdapter: Joi.func().required()
    // }).required(),
    keysInfo: internals.keysInfo,
    keys: internals.keys,
    // Feel free to assert your adapter's API against this schema
    api: {
        request: {
            importKey: Joi.object({
                key: Joi.string().required(),
                type: internals.allPubOrSec.required(),
                password: Joi.string()
                    .when('type', {
                        is: 'sec',
                        then: Joi.required(),
                        otherwise: Joi.forbidden()
                    })
            }),
            listKeys: Joi.object({
                search: Joi.string(),
                type: internals.allPubOrSec
            }),
            // TODO assert there's some encryption header like GPG or something
            encrypt: Joi.object({
                for: Joi.string().required(),
                clearText: Joi.string().required()
            }).required(),
            deleteKey: Joi.object({
                for: Joi.string()
            }).required()
        },
        response: {
            importKey: internals.keysInfo,
            listKeys: internals.keysInfo,
            // TODO assert there's some encryption header like GPG or something
            encrypt: Joi.string(),
            decrypt: Joi.string(),
            exportKeys: internals.keys,
            deleteKey: Joi.boolean()
        }
    }
};
