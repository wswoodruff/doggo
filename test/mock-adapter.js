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

internals.getAllKeyValues = async () => {

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

internals.getKeyBasicInfo = ({ fingerprint, identifier }) => ({
    fingerprint,
    identifier
});

internals.lower = (str) => str.toLowerCase();

internals.pickArr = (key, arr) => arr.map((obj) => obj[key]);

internals.getFileContents = async (path) => {

    const contents = await Fs.readFile(path);
    return contents.toString('utf8');
};

internals.searchForKeys = async (options) => {

    const {
        search = '',
        type = 'all',
        map = (x) => x,
        resolve = false
    } = options;

    const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

    const { lower, getFileContents } = internals;

    const filteredKeys = [
        PUB_SEC,
        SEC_ONLY,
        PUB_ONLY
    ]
        // Search
        .filter(({ fingerprint, identifier }) => {

            // Case-insensitive
            return lower(fingerprint).includes(lower(search))
                || lower(identifier).includes(lower(search));
        })
        // Type filter
        .filter(({ keyPaths }) => {

            switch (type) {
                case 'all':
                    return true;
                case 'pub':
                    return true; // All 'pub' or 'sec' keys have 'pub'
                case 'sec':
                    return !!keyPaths.sec;
            }
        })
        .map((keyInfo) => map(keyInfo));

    if (!resolve) {
        return filteredKeys;
    }

    // Add 'keyValues' prop
    return await Promise.all(
        filteredKeys
            .map(async ({ keyPaths, ...rest }) => {

                return {
                    ...rest,
                    keyPaths,
                    keyValues: {
                        pub: !keyPaths.pub ? null : await getFileContents(keyPaths.pub),
                        sec: !keyPaths.sec ? null : await getFileContents(keyPaths.sec)
                    }
                }
            })
    );
};

//////////////////////////////////

module.exports = {
    name: 'mock',
    genKeys: () => null,
    deleteKeys: () => null,
    importKey: async ({ key, type, password }) => {

        const {
            getAllKeyValues,
            getKeyBasicInfo
        } = internals;

        const {
            pubAndSecPubKey,
            pubAndSecSecKey,
            pubOnlyPubKey,
            secOnlySecKey
        } = await getAllKeyValues();

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
                throw new Error('Developer error');
        }

        return getKeyBasicInfo(matchedKey);
    },
    exportKey: () => null,
    listKeys: async ({ search, type, first } = {}) => {

        const {
            searchForKeys,
            pickArr
        } = internals;

        const keys = pickArr('keyValues', await searchForKeys({
            search,
            type,
            resolve: true
        }));

        if (first) {
            if (keys.length !== 1) {
                // TODO change to specific error pulled in from doggo
                throw new Error('Will only return first if one result exists');
            }
            return keys[0];
        }

        return keys;
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
