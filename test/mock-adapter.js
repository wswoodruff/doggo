'use strict';

// 'mock-adapter' is designed to pass the 'adapter-test-suite'
// by cheating and referencing the same test key info that the
// 'adapter-test-suite' uses.
// This couples them but also keeps them both in check.

const { promises: Fs } = require('fs');

const Joi = require('joi');

const Doggo = require('../lib');
const Schemas = require('../lib/schema');
// This lone warrior, 'TestKeyInfo', is the ultimate
// judge for if things between mock-adapter and
// 'adapter-test-suite' are lining up properly.
const TestKeyInfo = require('./test-key-info');

const internals = {};

const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

let naughtyDogBadBoiNoGoodGlobalEncryptionCounter = 0;

// This represents the state for imported keys that
// real cryptosystems will have
const importedKeys = {
    [PUB_SEC.fingerprint]: { pub: false, sec: false },
    [SEC_ONLY.fingerprint]: { pub: false, sec: false },
    [PUB_ONLY.fingerprint]: { pub: false, sec: false }
};

internals.addToImportedKeys = ({ fingerprint }, type) => {

    Joi.assert(type, Joi.valid('pub', 'sec'));

    importedKeys[fingerprint] = {
        ...importedKeys[fingerprint],
        [type]: true
    };
};

internals.removeFromImportedKeys = ({ fingerprint }, type) => {

    importedKeys[fingerprint] = {
        ...importedKeys[fingerprint],
        ...(type === 'all' ? { pub: false, sec: false } : { [type]: false })
    };
};

// TODO support a chainable api so we can tack on '.first()' for example

internals.getAllKeyValues = async () => {

    const pubAndSecPubKey = await Fs.readFile(PUB_SEC.keyPaths.pub);
    const pubAndSecSecKey = await Fs.readFile(PUB_SEC.keyPaths.sec);
    const pubOnlyPubKey = await Fs.readFile(PUB_ONLY.keyPaths.pub);
    const secOnlyPubKey = await Fs.readFile(SEC_ONLY.keyPaths.pub);
    const secOnlySecKey = await Fs.readFile(SEC_ONLY.keyPaths.sec);

    return {
        pubAndSecPubKey: pubAndSecPubKey.toString('utf8'),
        pubAndSecSecKey: pubAndSecSecKey.toString('utf8'),
        pubOnlyPubKey: pubOnlyPubKey.toString('utf8'),
        secOnlyPubKey: secOnlyPubKey.toString('utf8'),
        secOnlySecKey: secOnlySecKey.toString('utf8')
    };
};

internals.getKeyBasicInfo = ({ fingerprint, identifier }) => ({
    fingerprint,
    identifier
});

internals.lower = (str) => str.toLowerCase();

internals.pickArr = (keys, arr) => {

    return arr.map((obj) => {

        return [].concat(keys)
            .reduce((collector, key) => {

                return {
                    ...collector,
                    [key]: obj[key]
                };
            }, {});
    });
};

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

    const { lower, getFileContents } = internals;

    const filteredKeys = [
        PUB_SEC,
        SEC_ONLY,
        PUB_ONLY
    ]
        // Search filter
        .filter(({ fingerprint, identifier }) => {

            // Just being clunky but clear about what's going on
            if (!search) {
                return true;
            }

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
        return filteredKeys
            .map((key) => ({
                ...key,
                pub: null,
                sec: null
            }));
    }

    // Add 'keyValues' prop
    return await Promise.all(
        filteredKeys
            .map(async ({ keyPaths, ...rest }) => {

                return {
                    ...rest,
                    keyPaths,
                    keyValues: {
                        pub: (type !== 'pub' && type !== 'all') ? null : await getFileContents(keyPaths.pub),
                        sec: (type !== 'sec' && type !== 'all') ? null : await getFileContents(keyPaths.sec)
                    }
                };
            })
    );
};

module.exports = {
    name: 'mock-adapter',
    genKeys: (genKeyArgs) => {

        Joi.assert(genKeyArgs, Schemas.api.genKeys.request);
    },
    deleteKey: async (deleteKeyArgs) => {

        Joi.assert(deleteKeyArgs, Schemas.api.deleteKey.request);

        const {
            searchForKeys,
            removeFromImportedKeys
        } = internals;

        const { search, type } = deleteKeyArgs;

        const [keyToDelete] = await searchForKeys({
            search,
            type
        });

        removeFromImportedKeys(keyToDelete, type);

        return true;
    },
    importKey: async (importKeyArgs) => {

        Joi.assert(importKeyArgs, Schemas.api.importKey.request);

        const { key } = importKeyArgs;

        const {
            getAllKeyValues,
            getKeyBasicInfo,
            addToImportedKeys
        } = internals;

        const {
            pubAndSecPubKey,
            pubAndSecSecKey,
            pubOnlyPubKey,
            secOnlyPubKey,
            secOnlySecKey
        } = await getAllKeyValues();

        let matchedKey = {};

        switch (key) {
            case pubAndSecPubKey:
                matchedKey = PUB_SEC;
                addToImportedKeys(PUB_SEC, 'pub');
                break;
            case pubAndSecSecKey:
                matchedKey = PUB_SEC;
                addToImportedKeys(PUB_SEC, 'sec');
                break;
            case pubOnlyPubKey:
                matchedKey = PUB_ONLY;
                addToImportedKeys(PUB_ONLY, 'pub');
                break;
            case secOnlyPubKey:
                matchedKey = SEC_ONLY;
                addToImportedKeys(SEC_ONLY, 'pub');
                break;
            case secOnlySecKey:
                matchedKey = SEC_ONLY;
                addToImportedKeys(SEC_ONLY, 'sec');
                break;
            default:
                throw new Error('Developer error');
        }

        return getKeyBasicInfo(matchedKey);
    },
    exportKeys: async (exportKeysArgs) => {

        Joi.assert(exportKeysArgs, Schemas.api.exportKeys.request);

        const { searchForKeys } = internals;

        const { search, type } = exportKeysArgs;

        const keys = await searchForKeys({
            search,
            type,
            resolve: true
        });

        return keys
            .map(({
                fingerprint,
                identifier,
                keyValues
            }) => ({
                fingerprint,
                identifier,
                // importedKeys represents global state like what we have with a gpg keychain
                pub: importedKeys[fingerprint].pub ? keyValues.pub : null,
                sec: importedKeys[fingerprint].sec ? keyValues.sec : null
            }));
    },
    listKeys: async (listKeysArgs = {}) => {

        Joi.assert(listKeysArgs, Schemas.api.listKeys.request);

        const {
            searchForKeys,
            pickArr
        } = internals;

        const { search, type } = listKeysArgs;

        return pickArr(['fingerprint', 'identifier', 'pub', 'sec'], await searchForKeys({
            search,
            type
        }))
            // Make sure either a sec or pub key has been imported
            .filter((key) => (!!importedKeys[key.fingerprint].sec || !!importedKeys[key.fingerprint].pub));
    },
    encrypt: async (encryptArgs) => {

        Joi.assert(encryptArgs, Schemas.api.encrypt.request);

        const { search: encryptFor } = encryptArgs;

        const { searchForKeys } = internals;

        const keys = await searchForKeys({ search: encryptFor });

        if (keys.length > 1) {
            throw new Doggo.TooManyKeysError();
        }

        // Cheating here — we expect pubsec's info to be passed to 'search' —
        // if we make it this far...
        const [pubSec] = keys;

        // This couples the mock-adapter to the test for now
        // 'carKeys' here === TestKeyInfo.KEYS.PUB_SEC.encryptedText.carKeys
        const { encryptedText: { carKeys } } = pubSec;

        // Increment the 'naughtyDogBadBoiNoGoodGlobalEncryptionCounter' so we can
        // send different responses because true encryption won't ever
        // be the exact same twice.
        // This cycles through the items in 'carKeys.encrypted'
        return carKeys.encrypted[++naughtyDogBadBoiNoGoodGlobalEncryptionCounter % carKeys.encrypted.length];
    },
    decrypt: async (decryptArgs) => {

        // TODO make this more robust
        // Accommodate async
        await true;

        Joi.assert(decryptArgs, Schemas.api.decrypt.request);

        const { KEYS: { PUB_SEC: { encryptedText: { carKeys: { clearText } } } } } = TestKeyInfo;
        return clearText;
    },
    genPassword: (genPasswordArgs) => {

        Joi.assert(genPasswordArgs, Schemas.api.genPassword.request);
    },
    utils: {}
};
