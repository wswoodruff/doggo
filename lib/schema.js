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

internals.testDefault = { request: Joi.any(), response: Joi.any() };

module.exports = {
    adapter: Joi.object({
        name: Joi.string().required(),
        genKeys: Joi.func().arity(1).required(),
        deleteKey: Joi.func().arity(1).required(),
        importKey: Joi.func().arity(1).required(),
        exportKeys: Joi.func().arity(1).required(),
        listKeys: Joi.func().required(),
        encrypt: Joi.func().arity(1).required(),
        decrypt: Joi.func().arity(1).required(),
        genPassword: Joi.func().arity(1),
        utils: Joi.object()
    }).required().unknown(),
    // TODO
    // platform: Joi.object({
    //     readDir: Joi.func().required(),
    //     getAdapter: Joi.func().required()
    // }).required(),
    keysInfo: internals.keysInfo,
    keys: internals.keys,
    /*
     * =================================================
     * Assert your adapter's API against this schema
     * =================================================
    */
    api: {
        importKey: {
            request: Joi.object({
                key: Joi.string().required(),
                type: internals.allPubOrSec.required(),
                password: Joi.string()
                    .when('type', {
                        is: 'sec',
                        then: Joi.required(),
                        otherwise: Joi.forbidden()
                    })
            }),
            response: internals.keysInfo
        },
        listKeys: {
            request: Joi.object({
                search: Joi.string(),
                type: internals.allPubOrSec
            }),
            response: internals.keysInfo
        },
        exportKeys: internals.testDefault,
        encrypt: {
            request: Joi.object({
                for: Joi.string().required(),
                clearText: Joi.string().required()
            }).required(),
            response: Joi.string()
        },
        decrypt: {
            request: Joi.any(),
            response: Joi.any()
        },
        deleteKey: {
            request: Joi.object({
                for: Joi.string()
            }),
            response: Joi.boolean()
        }
    }
};
