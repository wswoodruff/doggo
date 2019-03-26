'use strict';

const Os = require('os');

module.exports = {
    get: (name, password, comment, email) => (
`Key-Type: eddsa
Key-Curve: ed25519
Key-Usage: sign
Subkey-Type: ecdh
Subkey-Curve: cv25519
Subkey-Usage: encrypt
Passphrase: test
Expire-Date: 0${name ? Os.EOL : ''}${name ? ('Name-Real: ' + name) : ''}${comment ? Os.EOL : ''}${comment ? ('Name-Comment: Doggo user - ' + comment) : ''}${email ? Os.EOL : ''}${email ? ('Name-Email:' + email) : ''}
%no-ask-passphrase
`)
};
