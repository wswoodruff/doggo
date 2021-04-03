'use strict';

const Os = require('os');

const Dedent = require('../vendor/dedent');
const Utils = require('./utils');

const internals = {};

// We <3 ed25519/cv25519
const PRIMARY_KEY = 'ed25519';
const SUBKEY_TYPE = 'ecdh';
const SUB_KEY_CURVE = 'cv25519';

module.exports = {
    get: (name, password, comment, email) => {

        const { lineIfParam } = internals;

        return Utils.removeEmptyLines(Dedent`Key-Type: eddsa
            Key-Curve: ${PRIMARY_KEY}
            Key-Usage: sign
            Subkey-Type: ${SUBKEY_TYPE}
            Subkey-Curve: ${SUB_KEY_CURVE}
            Subkey-Usage: encrypt
            Passphrase: ${password || 'test'}
            Expire-Date: 0
            ${lineIfParam(name, `Name-Real: ${name}`)}
            ${lineIfParam(comment, `Name-Comment: Doggo user - ' + ${comment}`)}
            ${email ? ('Name-Email:' + email) : ''}
            %no-ask-passphrase
        `);
    }
};

internals.lineIfParam = (param, line) => {

    return `${param ? Os.EOL : ''}${param ? line : ''}`;
};
