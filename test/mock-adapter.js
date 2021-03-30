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

const internals = {};

internals.getKeyValues = async () => {

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
};

internals.getKeyListInfo = ({ fingerprint, identifier }) => ({
    fingerprint,
    identifier
});

internals.lower = (str) => str.toLowerCase();

internals.searchForKeys = (search, type) => {

    const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

    const { lower } = internals;

    return [
        PUB_SEC,
        SEC_ONLY,
        PUB_ONLY
    ]
        .filter((keyInfo) => {

            const {
                fingerprint,
                identifier
            } = keyInfo;

            return lower(fingerprint).includes(lower(search)) || lower(identifier).includes(lower(search));
        })
        .map((keyInfo) => {

            //
        });
};

module.exports = {
    name: 'mock',
    genKeys: () => null,
    deleteKeys: () => null,
    importKey: async ({ key, type, password }) => {

        const { getKeyValues, getKeyListInfo } = internals;

        const {
            pubAndSecPubKey,
            pubAndSecSecKey,
            pubOnlyPubKey,
            secOnlySecKey
        } = await getKeyValues();

        const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

        let matchedKey = {};

        switch (key) {
            case pubAndSecPubKey:
                matchedKey = PUB_SEC;
                break;
            case pubAndSecSecKey:
                matchedKey = PUB_SEC;
                break;
            case pubOnlyPubKey:
                matchedKey = PUB_ONLY;
                break;
            case secOnlySecKey:
                matchedKey = SEC_ONLY;
                break;
            default:
                return { output: null, error: new Error('Developer error') };
        }

        return { output: getKeyListInfo(matchedKey), error: null };
    },
    exportKey: () => null,
    listKeys: (search, type) => {

        const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

        [PUB_SEC, SEC_ONLY, PUB_ONLY]
            .filter((keyInfo) => {

                const {
                    fingerprint,
                    identifier
                } = keyInfo;

                return fingerprint.includes(search) || identifier.includes(search);
            })
            .find(() => {

                //
            });
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
