'use strict';

const Joi = require('joi');

const Schema = require('./schema');

module.exports = (adapter) => {

    Joi.assert(adapter, Schema.adapter);

    return adapter;
};
