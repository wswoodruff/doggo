'use strict';

// 'mock-adapter' is designed to pass the 'adapter-test-suite'
// by cheating and referencing the same test key info that the
// 'adapter-test-suite' uses.
// This couples them but also keeps them both in check.

const { promises: Fs } = require('fs');

const Joi = require('joi');
const {
    InvalidKeyError,
    TooManyKeysError
} = require('../lib');

const Schemas = require('../lib/schema');
// This lone warrior, 'TestKeyInfo', is the ultimate
// judge for if things between mock-adapter and
// 'adapter-test-suite' are lining up properly.
const TestKeyInfo = require('./test-key-info');

const internals = {};

const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

// This hack helps us keep track to give different results
// for encrypting the same message multiple times
let naughtyDogBadBoiNoGoodGlobalEncryptionCounter = 0;

// This represents the state for imported keys that
// real cryptosystems will have
const importedKeys = {
    [String(PUB_SEC.fingerprint)]: { pub: false, sec: false },
    [String(SEC_ONLY.fingerprint)]: { pub: false, sec: false },
    [String(PUB_ONLY.fingerprint)]: { pub: false, sec: false }
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

// TODO support a chainable api so we can tack on '.first()' or something

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

internals.pick = (keys, obj) => {

    if (!obj) {
        return null;
    }

    return [].concat(keys)
        .reduce((collector, key) => {

            return {
                ...collector,
                [key]: obj[key]
            };
        }, {});
};

internals.pickArr = (keys, arr) => {

    return arr.map((obj) => internals.pick(keys, obj));
};

internals.getFileContents = async (path) => {

    const contents = await Fs.readFile(path);
    return contents.toString('utf8');
};

internals.searchForKeys = async (options) => {

    Joi.assert(
        options,
        Joi.object({
            search: Joi.string(),
            fingerprint: Joi.string().min(40).max(40),
            type: Joi.valid('pub', 'sec', 'all'),
            exportKeys: Joi.bool(),
            bypassImportedFilter: Joi.bool()
        })
    );

    const {
        search = '',
        fingerprint: fingerprintOption,
        type = 'all',
        exportKeys = false,
        bypassImportedFilter = false
    } = options;

    const { lower, getFileContents } = internals;

    let keys = [];

    if (fingerprintOption) {
        keys = [
            PUB_SEC,
            SEC_ONLY,
            PUB_ONLY
        ]
            // Fingerprint filter
            .filter(({ fingerprint }) => {

                // Case-insensitive
                return lower(fingerprint) === lower(fingerprintOption);
            });
    }
    else {
        keys = [
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
            });
    }

    // Key type filter
    keys = keys
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
        .filter(({ fingerprint }) => {

            if (bypassImportedFilter) {
                return true;
            }

            // Filter out unimported keys
            return !!(importedKeys[fingerprint].sec || importedKeys[fingerprint].pub);
        });

    if (!exportKeys) {
        // Set 'pub' and 'sec' to 'null' to signify they haven't been loaded in
        const res = keys.map((key) => ({ ...key, pub: null, sec: null }));

        if (fingerprintOption) {
            return res[0];
        }

        return res;
    }

    // 'exportKeys' is true so we'll grab those and add the 'keyValues' prop
    const res = await Promise.all(keys.map(async ({ keyPaths, ...rest }) => {

        const keyValues = {
            pub: null,
            sec: null
        };

        if (type === 'pub' || type === 'all') {
            keyValues.pub = !keyPaths.pub ? null : await getFileContents(keyPaths.pub);
        }

        if (type === 'sec' || type === 'all') {
            keyValues.sec = !keyPaths.sec ? null : await getFileContents(keyPaths.sec);
        }

        return {
            ...rest,
            keyPaths,
            keyValues
        };
    }));

    if (fingerprintOption) {
        return res[0];
    }

    return res;
};

module.exports = {
    name: 'mock-adapter',
    genKeys: (args) => {

        Joi.assert(args, Schemas.api.genKeys.request);
    },
    deleteKey: async (args) => {

        Joi.assert(args, Schemas.api.deleteKey.request);

        const {
            searchForKeys,
            removeFromImportedKeys
        } = internals;

        const { fingerprint, type } = args;

        const [keyToDelete] = await searchForKeys({
            search: fingerprint,
            type,
            bypassImportedFilter: true
        });

        removeFromImportedKeys(keyToDelete, type);

        return true;
    },
    importKey: async (args) => {

        Joi.assert(args, Schemas.api.importKey.request);

        const { key } = args;

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
                throw new InvalidKeyError();
        }

        return getKeyBasicInfo(matchedKey);
    },
    exportKeys: async (args) => {

        Joi.assert(args, Schemas.api.exportKeys.request);

        const { searchForKeys } = internals;

        const { fingerprint, type } = args;

        const {
            fingerprint: exportFingerprint,
            identifier,
            keyValues
        } = await searchForKeys({
            fingerprint,
            type,
            exportKeys: true
        });

        return {
            fingerprint: exportFingerprint,
            identifier,
            pub: keyValues.pub,
            sec: keyValues.sec
        };
    },
    listKeys: async (args = {}) => {

        Joi.assert(args, Schemas.api.listKeys.request);

        const {
            searchForKeys,
            pick,
            pickArr
        } = internals;

        const { search, fingerprint, type } = args;

        const keys = [
            'fingerprint',
            'identifier',
            'pub',
            'sec'
        ];

        if (fingerprint) {
            return pick(
                keys,
                await searchForKeys({
                    fingerprint,
                    type
                })
            );
        }

        return pickArr(
            keys,
            await searchForKeys({
                search,
                type
            })
        );
    },
    encrypt: async (args) => {

        Joi.assert(args, Schemas.api.encrypt.request);

        const { search: encryptFor } = args;

        const { searchForKeys } = internals;

        const keys = await searchForKeys({ search: encryptFor });

        if (keys.length > 1) {
            throw new TooManyKeysError();
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
    decrypt: async (args) => {

        // TODO make this more robust
        // Accommodate async
        await true;

        Joi.assert(args, Schemas.api.decrypt.request);

        const { KEYS: { PUB_SEC: { encryptedText: { carKeys: { clearText } } } } } = TestKeyInfo;
        return clearText;
    },
    genPassword: (args) => {

        Joi.assert(args, Schemas.api.genPassword.request);
    },
    utils: {}
};
