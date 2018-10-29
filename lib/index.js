'use strict';

const Joi = require('joi');
const Cryptiles = require('cryptiles');

const DoggoCore = require('doggo-core');

const internals = {};

module.exports = (adapter, config, platform) => {

    const api = internals.getApi(adapter, config, platform);
    return DoggoCore(adapter, api, config);
};

internals.getApi = (adapter, config, platform) => {

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
