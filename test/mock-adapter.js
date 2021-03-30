'use strict';

// 'mock-adapter' is designed to pass the 'adapter-test-suite'
// by cheating and referencing the same test key info that the
// 'adapter-test-suite' uses.
// This couples them but also keeps them both in check.

const { promises: Fs } = require('fs');

// This lone warrior, 'TestKeyInfo', is the ultimate
// judge for if things between mock-adapter and
// 'adapter-test-suite' are lining up properly.
const TestKeyInfo = require('./test-key-info');

const internals = {
    getKeyValues: async () => {

        const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

        const pubAndSecPubKey = await Fs.readFile(PUB_SEC.keyPaths.pub);
        const pubAndSecSecKey = await Fs.readFile(PUB_SEC.keyPaths.sec);
        const pubOnlyPubKey = await Fs.readFile(PUB_ONLY.keyPaths.pub);
        const secOnlySecKey = await Fs.readFile(SEC_ONLY.keyPaths.sec);

        return {
            pubAndSecPubKey: pubAndSecPubKey.toString('utf8'),
            pubAndSecSecKey: pubAndSecSecKey.toString('utf8'),
            pubOnlyPubKey: pubOnlyPubKey.toString('utf8'),
            secOnlySecKey: secOnlySecKey.toString('utf8')
        };
    }
};

module.exports = {
    name: 'mock',
    genKeys: () => null,
    deleteKeys: () => null,
    importKey: async (str, type) => {

        const {
            pubAndSecPubKey,
            pubAndSecSecKey,
            pubOnlyPubKey,
            secOnlySecKey
        } = await internals.getKeyValues();

        const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

        let output = '';

        switch (str) {
            case pubAndSecPubKey:
                output = PUB_SEC.identifier;
                break;
            case pubAndSecSecKey:
                output = PUB_SEC.identifier;
                break;
            case pubOnlyPubKey:
                output = PUB_ONLY.identifier;
                break;
            case secOnlySecKey:
                output = SEC_ONLY.identifier;
                break;
            default:
                throw new Error('Developer error');
        }

        return { output };
    },
    exportKey: () => null,
    listKeys: (search, type) => {

        //
    },
    encrypt: () => null,
    decrypt: () => null,
    genPassword: () => null,
    keyExists: () => null,
    getAdapterArgs: () => null,
    execute: () => null,
    utils: {
        firstKeyFromList: () => null,
        keysForIdentifier: () => null,
        firstKeyForIdentifier: () => null
    }
};
