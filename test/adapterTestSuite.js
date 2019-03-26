'use strict';

const Util = require('util');
const Fs = require('fs');
const Path = require('path');

const KeyConfig = require('../lib/keyConfig');
const TestKeyConfig = require('./testKeyConfig');
const Bounce = require('bounce');
const Schema = require('../lib/schema');
const Joi = require('joi');

const internals = {};

// TODO clear gpg cache before these tests
// Run 'gpgconf --kill gpg-agent'

// TODO normalize adapter output to something like
// { output, fingerprints, ...etc }

internals.constants = {
    KEYS: {
        PUB_SEC: {
            fingerprint: '8EE6530544AD9745D5A32C485E27573F6126A601',
            identifier: 'doggo test pubSec 09723339678055607',
            password: 'test',
            keyPaths: {
                pub: Path.join(__dirname, 'secures/keys/pubSec.pub'),
                sec: Path.join(__dirname, 'secures/keys/pubSec.sec')
            }
        },
        SEC_ONLY: {
            fingerprint: 'C621F4FD6113F55B1AFC0ED13844975650F7B6FC',
            identifier: 'doggo test sec only 07654950429608411',
            password: 'test',
            keyPaths: {
                sec: Path.join(__dirname, 'secures/keys/secOnly.sec')
            }
        },
        PUB_ONLY: {
            fingerprint: 'ED13DABE5CFDBCF66C50C42490C974227C71F5E0',
            identifier: 'doggo test pub only 064285959780167',
            keyPaths: {
                pub: Path.join(__dirname, 'secures/keys/pubOnly.pub')
            }
        }
    }
};


module.exports = class DoggoAdapterTestSuite {

    constructor(adapter, testUtils) {

        this.adapter = adapter;
        this.doggoCore = require('../lib')(adapter);
        this.testUtils = testUtils;
    }

    genTests() {

        const { name } = this.adapter;
        const { expect, lab: { before, describe, it } } = this.testUtils;
        const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = internals.constants;

        const promiseReadFile = Util.promisify(Fs.readFile);

        const DoggoCore = this.doggoCore;

        describe(`adapter "${name}" tests:`, () => {

            it('imports keys', async () => {

                const psPubKey = await promiseReadFile(PUB_SEC.keyPaths.pub);
                const psSecKey = await promiseReadFile(PUB_SEC.keyPaths.sec);
                const poPubKey = await promiseReadFile(PUB_ONLY.keyPaths.pub);
                const soSecKey = await promiseReadFile(SEC_ONLY.keyPaths.sec);

                const { output: psPubKeyImportRes } = await DoggoCore.api.importKey(psPubKey.toString('utf8'), 'pub');
                const { output: poPubKeyImportRes } = await DoggoCore.api.importKey(poPubKey.toString('utf8'), 'pub');

                expect(psPubKeyImportRes).to.include(PUB_SEC.identifier);
                expect(poPubKeyImportRes).to.include(PUB_ONLY.identifier);

                const importSecretKeys = async (srcPubSec, srcSecOnly) => {
                    const { output: psSecKeyImportRes } = await DoggoCore.api.importKey(srcPubSec, 'sec', PUB_SEC.password);
                    const { output: soSecKeyImportRes } = await DoggoCore.api.importKey(srcSecOnly, 'sec', SEC_ONLY.password);

                    expect(psSecKeyImportRes).to.include(PUB_SEC.identifier);
                    expect(soSecKeyImportRes).to.include(SEC_ONLY.identifier);
                }

                if (DoggoCore.adapter.name === 'gpg') {
                    // gpg adapter specific
                    // When importing a secret key it must be a filepath
                    importSecretKeys(PUB_SEC.keyPaths.sec, SEC_ONLY.keyPaths.sec);
                }
                else {
                    importSecretKeys(psSecKey.toString('utf8'), soSecKey.toString('utf8'));
                }

                // Wait a couple secs for gpg to get its act together.
                // Having issues with these imported keys not showing up immediately
                // in lists
                if (DoggoCore.adapter.name === 'gpg') {
                    return new Promise((res) => setTimeout(() => res(), 2000));
                }
            });

            it('lists keys', async () => {

                const pubKeys = await DoggoCore.api.listKeys('', 'pub');
                const secKeys = await DoggoCore.api.listKeys('', 'sec');
                const allKeys = await DoggoCore.api.listKeys();

                Joi.assert(allKeys, Schema.keysObj, 'listKeys must match schema \'keysObj\' in doggo-core/lib/schema.js');
                Joi.assert(pubKeys, Schema.keysList, 'pub keyList must match schema \'keysList\' in doggo-core/lib/schema.js');
                Joi.assert(secKeys, Schema.keysList, 'sec keyList must match schema \'keysList\' in doggo-core/lib/schema.js');

                const { pub, sec } = allKeys;

                expect(pub).to.equal(pubKeys);

                expect(sec).to.equal(secKeys);

                // Finding a key

                const pubKeysSearchForPubOnly = await DoggoCore.api.listKeys(PUB_ONLY.identifier, 'pub');
                const secKeysSearchForPubSec = await DoggoCore.api.listKeys(PUB_SEC.identifier, 'sec');

                const pubKeysForPubOnly = DoggoCore.api.utils.keysForIdentifier(PUB_ONLY.identifier, pubKeysSearchForPubOnly);
                const secKeysForPubSec = DoggoCore.api.utils.keysForIdentifier(PUB_SEC.identifier, secKeysSearchForPubSec);

                const pubOnlyPubKey = DoggoCore.api.utils.firstKeyFromList(PUB_ONLY.identifier, pubKeysSearchForPubOnly);
                const pubSecSecKey = DoggoCore.api.utils.firstKeyFromList(PUB_SEC.identifier, secKeysSearchForPubSec);

                expect(pubKeysForPubOnly.length).to.equal(1);
                expect(pubKeysForPubOnly[0]).to.equal(pubOnlyPubKey);
                expect(secKeysForPubSec.length).to.equal(1);
                expect(secKeysForPubSec[0]).to.equal(pubSecSecKey);

                expect(pubKeys).to.include(pubOnlyPubKey);
                expect(secKeys).to.include(pubSecSecKey);

                //

                const firstKeyForPubOnly = DoggoCore.api.utils.firstKeyForIdentifier(PUB_ONLY.identifier, pubKeysSearchForPubOnly);
                const firstKeyForPubSec = DoggoCore.api.utils.firstKeyForIdentifier(PUB_SEC.identifier, secKeysSearchForPubSec);

                expect(firstKeyForPubOnly).to.equal(pubOnlyPubKey);
                expect(firstKeyForPubSec).to.equal(pubSecSecKey);
            });

            it('checks if a key exists for a keyIdentifier', async () => {

                const { pub, sec } = await DoggoCore.api.listKeys();

                const poPubExists = await DoggoCore.api.keyExists(PUB_ONLY.identifier, pub);
                const poSecexists = await DoggoCore.api.keyExists(PUB_ONLY.identifier, sec);

                const psPubExists = await DoggoCore.api.keyExists(PUB_SEC.identifier, pub);
                const psSecExists = await DoggoCore.api.keyExists(PUB_SEC.identifier, sec);

                expect(poPubExists).to.equal(true);
                expect(poSecexists).to.equal(false);

                expect(psPubExists).to.equal(true);
                expect(psSecExists).to.equal(true);
            });

            it('encrypts and decrypts text for a user', async () => {

                const srcFile = __dirname + '/secures/plaintext.txt';
                const destFile = __dirname + '/secures/plaintext.gpg';
                const decryptPath = __dirname + '/secures/plaintext.gpg.decrypt';

                await DoggoCore.api.encrypt(PUB_SEC.identifier, srcFile, destFile);

                const plaintext = await promiseReadFile(srcFile);
                const encrypted = await promiseReadFile(destFile);

                // Pretty naiive check but meh I'm just a doggo
                // How do you check if something looks encrypted?
                const encryptedToString = encrypted.toString('utf8');

                expect(encryptedToString).to.not.equal(plaintext.toString('utf8'));

                if (DoggoCore.adapter.name === 'gpg') {
                    expect(encryptedToString).to.include('-----BEGIN PGP MESSAGE-----');
                    expect(encryptedToString).to.include('-----END PGP MESSAGE-----');
                }

                await DoggoCore.api.decrypt(destFile, decryptPath, 'test');

                const decrypted = await promiseReadFile(decryptPath);
                expect(decrypted.toString('utf8')).to.equal(plaintext.toString('utf8'));
            });

            it('exports keys', async (done) => {

                // pub
                const poPublicKey = await promiseReadFile(__dirname + '/secures/keys/pubOnly.pub');

                const pubExportKeyPath = `${__dirname}/secures/keys/test.pub`;
                await DoggoCore.api.exportKey(PUB_ONLY.fingerprint, 'pub', pubExportKeyPath);

                const exportedPublicKey = await promiseReadFile(pubExportKeyPath);

                expect(exportedPublicKey.toString('utf8')).to.equal(poPublicKey.toString('utf8'));

                // sec
                const secExportKeyPath = `${__dirname}/secures/keys/test.sec`;
                await DoggoCore.api.exportKey(SEC_ONLY.identifier, 'sec', secExportKeyPath, 'test');

                const exportedSecretKey = await promiseReadFile(secExportKeyPath);

                // Secret keys are symmetrically encrypted by gpg when exported for protection.
                if (DoggoCore.adapter.name === 'gpg') {
                    expect(exportedSecretKey.toString('utf8')).to.include('-----BEGIN PGP PRIVATE KEY BLOCK-----');
                    expect(exportedSecretKey.toString('utf8')).to.include('-----END PGP PRIVATE KEY BLOCK-----');
                }
            });

            it('deletes keys', async () => {

                const { pub: beginPub, sec: beginSec } = await DoggoCore.api.listKeys();

                const beginPubOnlyPubKeyExists = DoggoCore.api.keyExists(PUB_ONLY.fingerprint, beginPub);
                const beginPubOnlySecKeyExists = DoggoCore.api.keyExists(PUB_ONLY.fingerprint, beginSec);
                const beginSecOnlyPubKeyExists = DoggoCore.api.keyExists(SEC_ONLY.fingerprint, beginPub);
                const beginSecOnlySecKeyExists = DoggoCore.api.keyExists(SEC_ONLY.fingerprint, beginSec);
                const beginPubSecPubKeyExists = DoggoCore.api.keyExists(PUB_SEC.fingerprint, beginPub);
                const beginPubSecSecKeyExists = DoggoCore.api.keyExists(PUB_SEC.fingerprint, beginSec);

                expect(beginPubOnlyPubKeyExists).to.equal(true);
                expect(beginPubOnlySecKeyExists).to.equal(false);
                // Importing a secret key automatically imports the public key
                expect(beginSecOnlyPubKeyExists).to.equal(true);
                expect(beginSecOnlySecKeyExists).to.equal(true);
                expect(beginPubSecPubKeyExists).to.equal(true);
                expect(beginPubSecSecKeyExists).to.equal(true);

                // Delete 'em

                await DoggoCore.api.deleteKeys(PUB_ONLY.fingerprint, 'pub');
                await DoggoCore.api.deleteKeys(SEC_ONLY.fingerprint, 'all');

                // Trying to delete a public key before a secret key throws an error in gpg
                await DoggoCore.api.deleteKeys(PUB_SEC.fingerprint, 'sec');
                await DoggoCore.api.deleteKeys(PUB_SEC.fingerprint, 'pub');

                // Check lists

                const { pub: afterDeletePub, sec: afterDeleteSec } = await DoggoCore.api.listKeys();

                const afterDeletePubOnlyPubKeyExists = DoggoCore.api.keyExists(PUB_ONLY.fingerprint, afterDeletePub);
                const afterDeletePubOnlySecKeyExists = DoggoCore.api.keyExists(PUB_ONLY.fingerprint, afterDeleteSec);
                const afterDeleteSecOnlyPubKeyExists = DoggoCore.api.keyExists(SEC_ONLY.fingerprint, afterDeletePub);
                const afterDeleteSecOnlySecKeyExists = DoggoCore.api.keyExists(SEC_ONLY.fingerprint, afterDeleteSec);
                const afterDeletePubSecPubKeyExists = DoggoCore.api.keyExists(PUB_SEC.fingerprint, afterDeletePub);
                const afterDeletePubSecSecKeyExists = DoggoCore.api.keyExists(PUB_SEC.fingerprint, afterDeleteSec);

                expect(afterDeletePubOnlyPubKeyExists).to.equal(false);
                expect(afterDeletePubOnlySecKeyExists).to.equal(false);
                expect(afterDeleteSecOnlyPubKeyExists).to.equal(false);
                expect(afterDeleteSecOnlySecKeyExists).to.equal(false);
                expect(afterDeletePubSecPubKeyExists).to.equal(false);
                expect(afterDeletePubSecSecKeyExists).to.equal(false);
            });
        });
    }
};

internals.safeUnlink = async (unlinkPath) => {

    if (await Util.promisify(Fs.exists)(unlinkPath)) {
        await Util.promisify(Fs.unlink)(unlinkPath);
    }
};

internals.genKeys = async (Doggo, ...args) => await DoggoCore.api.genKeys(...args);

internals.randomNumberNoDot = () => String(Math.random()).replace('.', '');

internals.extractFingerprintFromCreationSuccessMessage = async (msg) => {

    const [err, res] = await DoggoCore.api.getFingerprint(msg.split(' key ')[1].split(' ')[0]);
    expect(res.length).to.equal(1);
    return res[0].fingerprint;
};

internals.isCI = () => process.env.TRAVIS || process.env.CI;
