'use strict';

const Cryptiles = require('cryptiles');
const Joi = require('joi');

const DoggoCore = require('doggo-core');

const Schema = require('./schema');

const internals = {};

module.exports = (adapter, config) => {

    const api = internals.getApi(adapter, config);
    return DoggoCore(adapter, api, config);
};

internals.getApi = (adapter, config) => {

    const api = {};

    // TODO this needs to be moved to doggo
    api.genPassword = () => {

        const specialChars = '$!#$&*+?-';

        const cryptilesStr = Cryptiles.randomString(44);
        const cryptilesArr = cryptilesStr.split('');

        for (let i = 0; i < 12; ++i) {

            const index = Math.floor((Math.random() * cryptilesArr.length - 1) + 1);

            cryptilesArr.splice(index, 1,
                specialChars[
                    Math.floor(Math.random() * specialChars.length)
                ]
            );
        }

        return Cryptiles.randomDigits(1) + cryptilesArr.join('');
    };

    return Object.assign({}, adapter, api);
};
