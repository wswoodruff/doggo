'use strict';

// This file also serves as API documentation

const Joi = require('joi');

const internals = {};

internals.fingerprint = Joi.string().min(40).max(40);

internals.keys = Joi.array().single().items({
    fingerprint: internals.fingerprint.required(),
    identifier: Joi.string().required(),
    // TODO look for some PGP headers or something
    pub: Joi.string().required().allow(null),
    sec: Joi.string().required().allow(null)
}).required();

// internals.testDefault = { request: Joi.any(), response: Joi.any() };

module.exports = {
    keysInfo: Joi.array().single().items({
        fingerprint: internals.fingerprint.required(),
        identifier: Joi.string().required()
    }).required(),
    keys: internals.keys,
    /*
     * Keep in-sync with 'api' below
     */
    adapter: Joi.object({
        genKeys: Joi.func().arity(1).required(),
        importKey: Joi.func().arity(1).required(),
        listKeys: Joi.func().required(),
        exportKeys: Joi.func().arity(1).required(),
        encrypt: Joi.func().arity(1).required(),
        decrypt: Joi.func().arity(1).required(),
        genPassword: Joi.func().arity(1),
        deleteKey: Joi.func().arity(1).required(),
        utils: Joi.object()
    }).required().unknown(),
    /*
     * =================================================
     * Assert your adapter's API against this schema
     * =================================================
     */
    api: {
        name: Joi.string().required(),
        genKeys: {
            request: Joi.object({
                password: Joi.string()
                    .when('type', {
                        is: 'sec',
                        then: Joi.required(),
                        otherwise: Joi.forbidden()
                    })
            }),
            response: Joi.array().single().items({
                fingerprint: internals.fingerprint.required(),
                identifier: Joi.string().required()
            }).required()
        },
        importKey: {
            request: Joi.object({
                key: Joi.string().required(),
                type: Joi.string().valid('all', 'pub', 'sec').required(),
                password: Joi.string()
                    .when('type', {
                        is: 'sec',
                        then: Joi.required(),
                        otherwise: Joi.forbidden()
                    })
            }),
            response: Joi.array().single().items({
                fingerprint: internals.fingerprint.required(),
                identifier: Joi.string().required()
            }).required()
        },
        listKeys: {
            request: Joi.object({
                search: Joi.string(),
                type: Joi.string().valid('all', 'pub', 'sec')
            }),
            response: Joi.array().single().items({
                fingerprint: internals.fingerprint.required(),
                identifier: Joi.string().required(),
                pub: Joi.valid(null),
                sec: Joi.valid(null)
            }).required()
        },
        exportKeys: {
            request: Joi.any(),
            response: Joi.any()
        },
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
        genPassword: {
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
