'use strict';

const Os = require('os');

// const Dedent = require('../vendor/dedent');

// console.log('Dedent', Dedent);

const internals = {};

module.exports = {
    get: (name, password, comment, email) => {

        const { lineIfParam } = internals;

        return `Key-Type: eddsa
Key-Curve: ed25519
Key-Usage: sign
Subkey-Type: ecdh
Subkey-Curve: cv25519
Subkey-Usage: encrypt
Passphrase: ${password || 'test'}
Expire-Date: 0${lineIfParam(name, `Name-Real: ${name}`)}${lineIfParam(comment, `Name-Comment: Doggo user - ' + ${comment}`)}${email ? Os.EOL : ''}${email ? ('Name-Email:' + email) : ''}
%no-ask-passphrase`;
    }
};

internals.lineIfParam = (param, line) => {

    return `${param ? Os.EOL : ''}${param ? line : ''}`;
};
