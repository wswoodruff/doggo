'use strict';

const { promises: Fs } = require('fs');

const Joi = require('joi');

const Schemas = require('../lib/schema');
const TestKeyInfo = require('./test-key-info');

const internals = {};

module.exports = class DoggoAdapterTestSuite {

    constructor(adapter, testUtils = {}) {

        Joi.assert(adapter, Schemas.adapter, 'Invalid adapter passed');

        this.adapter = adapter;
        this.doggo = require('../lib')(adapter);

        Joi.assert(
            testUtils,
            Joi.object({
                expect: Joi.func().required(),
                describe: Joi.func().required(),
                it: Joi.func().required()
            }).required(),
            'Invalid testUtils passed'
        );

        this.testUtils = testUtils;
    }

    run() {

        const { name } = this.adapter;
        const { expect, describe, it } = this.testUtils;
        const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

        const Doggo = this.doggo;

        const IS_GPG = Doggo.api.name === 'gpg';

        const getFile = async (path) => {

            const file = await Fs.readFile(path);
            return file.toString('utf8');
        };

        const getKeyForImportKey = async (path) => {

            return IS_GPG ? path : await getFile(path);
        };

        const importAllKeys = async () => {

            const pubSecSec = await Doggo.api.importKey({
                key: await getKeyForImportKey(PUB_SEC.keyPaths.sec),
                type: 'sec',
                password: PUB_SEC.password
            });

            const pubSecPub = await Doggo.api.importKey({
                key: await getKeyForImportKey(PUB_SEC.keyPaths.pub),
                type: 'pub'
            });

            const secOnlyPub = await Doggo.api.importKey({
                key: await getKeyForImportKey(SEC_ONLY.keyPaths.pub),
                type: 'pub'
            });

            const secOnlySec = await Doggo.api.importKey({
                key: await getKeyForImportKey(SEC_ONLY.keyPaths.sec),
                type: 'sec',
                password: SEC_ONLY.password
            });

            const pubOnlyPub = await Doggo.api.importKey({
                key: await getKeyForImportKey(PUB_ONLY.keyPaths.pub),
                type: 'pub'
            });

            return {
                pubSecSec,
                pubSecPub,
                secOnlyPub,
                secOnlySec,
                pubOnlyPub
            };
        };

        const deleteAllTestKeys = async () => {

            expect(await Doggo.api.deleteKey({
                fingerprint: PUB_SEC.fingerprint,
                type: 'all',
                password: PUB_SEC.password
            })).to.equal(true);
            expect(await Doggo.api.deleteKey({
                fingerprint: SEC_ONLY.fingerprint,
                type: 'all',
                password: SEC_ONLY.password
            })).to.equal(true);
            expect(await Doggo.api.deleteKey({
                fingerprint: PUB_ONLY.fingerprint,
                type: 'pub'
            })).to.equal(true);
        };

        describe(`DoggoAdapterTestSuite: doggo adapter "${name}" tests:`, () => {

            it('validates importKey args', async () => {

                let pubError1;
                let pubError2;
                let secError1;

                try {
                    await Doggo.api.importKey({
                        type: 'pub'
                    });
                }
                catch (err) {
                    pubError1 = err;
                }

                expect(pubError1 && pubError1.isJoi).to.equal(true);
                expect(pubError1).to.match(/"key" is required/);

                try {
                    await Doggo.api.importKey({
                        badKey: '123',
                        key: 'abc',
                        type: 'pub'
                    });
                }
                catch (err) {
                    pubError2 = err;
                }

                expect(pubError2 && pubError2.isJoi).to.equal(true);
                expect(pubError2).to.match(/"badKey" is not allowed/);

                try {
                    await Doggo.api.importKey({
                        key: 'abc-notakey',
                        type: 'sec'
                    });
                }
                catch (err) {
                    secError1 = err;
                }

                expect(secError1 && secError1.isJoi).to.equal(true);
                expect(secError1).to.match(/"password" is required/);
            });

            it('imports a valid public key', async () => {

                const pubSecPub = await Doggo.api.importKey({
                    key: await getKeyForImportKey(PUB_SEC.keyPaths.pub),
                    type: 'pub'
                });

                // Assert output matches API schema
                expect(() => Joi.assert(pubSecPub, Schemas.api.importKey.response)).to.not.throw();

                // Assert correct key info was returned
                expect(pubSecPub.fingerprint).to.equal(PUB_SEC.fingerprint);
                expect(pubSecPub.identifier).to.equal(PUB_SEC.identifier);

                await deleteAllTestKeys();
            });

            it('throws InvalidKeyError when importing an invalid key', async () => {

                await expect(Doggo.api.importKey({
                    key: 'abc-notakey',
                    type: 'pub'
                })).to.reject(Doggo.InvalidKeyError);
            });

            it('imports a valid secret key', async () => {

                const pubSecSec = await Doggo.api.importKey({
                    key: await getKeyForImportKey(PUB_SEC.keyPaths.sec),
                    type: 'sec',
                    password: PUB_SEC.password
                });

                // Assert output matches API schema
                expect(() => Joi.assert(pubSecSec, Schemas.api.importKey.response)).to.not.throw();

                // Assert correct key info was returned
                expect(pubSecSec.fingerprint).to.equal(PUB_SEC.fingerprint);
                expect(pubSecSec.identifier).to.equal(PUB_SEC.identifier);

                await deleteAllTestKeys();
            });

            it('importing valid keys is idempotent', async () => {

                const {
                    pubSecSec: firstPubSecSec,
                    pubSecPub: firstPubSecPub,
                    secOnlySec: firstSecOnlySec,
                    pubOnlyPub: firstPubOnlyPub
                } = await importAllKeys();

                const {
                    pubSecSec,
                    pubSecPub,
                    secOnlySec,
                    pubOnlyPub
                } = await importAllKeys();

                expect(firstPubSecSec).to.equal(pubSecSec);
                expect(firstPubSecPub).to.equal(pubSecPub);
                expect(firstSecOnlySec).to.equal(secOnlySec);
                expect(firstPubOnlyPub).to.equal(pubOnlyPub);

                // Assert output matches API schema
                expect(() => Joi.assert(pubSecSec, Schemas.api.importKey.response)).to.not.throw();
                expect(() => Joi.assert(pubSecPub, Schemas.api.importKey.response)).to.not.throw();
                expect(() => Joi.assert(secOnlySec, Schemas.api.importKey.response)).to.not.throw();
                expect(() => Joi.assert(pubOnlyPub, Schemas.api.importKey.response)).to.not.throw();

                // Assert correct key info was returned
                expect(pubSecSec.fingerprint).to.equal(PUB_SEC.fingerprint);
                expect(pubSecSec.identifier).to.equal(PUB_SEC.identifier);

                expect(pubSecPub.fingerprint).to.equal(PUB_SEC.fingerprint);
                expect(pubSecPub.identifier).to.equal(PUB_SEC.identifier);

                expect(secOnlySec.fingerprint).to.equal(SEC_ONLY.fingerprint);
                expect(secOnlySec.identifier).to.equal(SEC_ONLY.identifier);

                expect(pubOnlyPub.fingerprint).to.equal(PUB_ONLY.fingerprint);
                expect(pubOnlyPub.identifier).to.equal(PUB_ONLY.identifier);

                await deleteAllTestKeys();
            });

            it('validates listKeys args', async () => {

                let error;

                try {
                    await Doggo.api.listKeys({ badKey2: 'all' });
                }
                catch (err) {
                    error = err;
                }

                expect(error && error.isJoi).to.equal(true);
                expect(error.message).to.match(/"badKey2" is not allowed/);
            });

            it('lists all available keys for type "all"', async () => {

                const { findCompare } = internals;

                await importAllKeys();

                const keys = await Doggo.api.listKeys({ type: 'all' });

                // Assert output matches API schema
                expect(() => Joi.assert(keys, Schemas.api.listKeys.response)).to.not.throw();

                // Might have other keys on the keychain
                expect(keys.length).to.be.at.least(3);

                expect(findCompare({ arr: keys, compare: PUB_SEC, on: 'fingerprint' })).to.exist();
                expect(findCompare({ arr: keys, compare: PUB_ONLY, on: 'fingerprint' })).to.exist();
                expect(findCompare({ arr: keys, compare: SEC_ONLY, on: 'fingerprint' })).to.exist();

                await deleteAllTestKeys();
            });

            it('lists all available keys if passed no options', async () => {

                const { findCompare } = internals;

                await importAllKeys();

                const keys = await Doggo.api.listKeys();

                // Assert output matches API schema
                expect(() => Joi.assert(keys, Schemas.api.listKeys.response)).to.not.throw();

                // Might have other keys on the keychain
                expect(keys.length).to.be.at.least(3);

                expect(findCompare({ arr: keys, compare: PUB_SEC, on: 'fingerprint' })).to.exist();
                expect(findCompare({ arr: keys, compare: PUB_ONLY, on: 'fingerprint' })).to.exist();
                expect(findCompare({ arr: keys, compare: SEC_ONLY, on: 'fingerprint' })).to.exist();

                await deleteAllTestKeys();
            });

            it('lists available public keys for type "pub"', async () => {

                const { findCompare } = internals;

                await importAllKeys();

                const keys = await Doggo.api.listKeys({ type: 'pub' });

                // Assert output matches API schema
                expect(() => Joi.assert(keys, Schemas.api.listKeys.response)).to.not.throw();

                // Might have other keys on the keychain
                expect(keys.length).to.be.at.least(3);

                expect(findCompare({ arr: keys, compare: PUB_SEC, on: 'fingerprint' })).to.exist();
                expect(findCompare({ arr: keys, compare: PUB_ONLY, on: 'fingerprint' })).to.exist();
                expect(findCompare({ arr: keys, compare: SEC_ONLY, on: 'fingerprint' })).to.exist();

                await deleteAllTestKeys();
            });

            it('lists available secret keys for type "sec"', async () => {

                const { findCompare } = internals;

                await importAllKeys();

                const keys = await Doggo.api.listKeys({ type: 'sec' });

                // Assert output matches API schema
                expect(() => Joi.assert(keys, Schemas.api.listKeys.response)).to.not.throw();

                // Might have other keys on the keychain
                expect(keys.length).to.be.at.least(2);

                expect(findCompare({ arr: keys, compare: PUB_SEC, on: 'fingerprint' })).to.exist();
                expect(findCompare({ arr: keys, compare: SEC_ONLY, on: 'fingerprint' })).to.exist();
                // NOTE: does "not" exist
                expect(findCompare({ arr: keys, compare: PUB_ONLY, on: 'fingerprint' })).to.not.exist();

                await deleteAllTestKeys();
            });

            it('lists a key by fingerprint using "fingerprint"', async () => {

                const { findCompare } = internals;

                await importAllKeys();

                const key = await Doggo.api.listKeys({ fingerprint: PUB_SEC.fingerprint });

                expect(() => Joi.assert(key, Schemas.api.listKeys.response)).to.not.throw();

                expect(findCompare({ arr: [key], compare: PUB_SEC, on: 'fingerprint' })).to.exist();
                // NOTE: to "not" exist
                expect(findCompare({ arr: [key], compare: SEC_ONLY, on: 'fingerprint' })).to.not.exist();
                expect(findCompare({ arr: [key], compare: PUB_ONLY, on: 'fingerprint' })).to.not.exist();

                await deleteAllTestKeys();
            });

            it('lists a key by fingerprint using "search"', async () => {

                const { findCompare } = internals;

                await importAllKeys();

                const keys = await Doggo.api.listKeys({ search: PUB_SEC.fingerprint });

                expect(keys.length).to.equal(1);

                expect(() => Joi.assert(keys, Schemas.api.listKeys.response)).to.not.throw();

                expect(findCompare({ arr: keys, compare: PUB_SEC, on: 'fingerprint' })).to.exist();
                // NOTE: to "not" exist
                expect(findCompare({ arr: keys, compare: SEC_ONLY, on: 'fingerprint' })).to.not.exist();
                expect(findCompare({ arr: keys, compare: PUB_ONLY, on: 'fingerprint' })).to.not.exist();

                await deleteAllTestKeys();
            });

            it('lists a key by identifier', async () => {

                const { findCompare } = internals;

                await importAllKeys();

                const keys = await Doggo.api.listKeys({ search: SEC_ONLY.identifier });

                expect(() => Joi.assert(keys, Schemas.api.listKeys.response)).to.not.throw();

                expect(findCompare({ arr: keys, compare: SEC_ONLY, on: 'identifier' })).to.exist();
                // NOTE: to.not.exist()
                expect(findCompare({ arr: keys, compare: PUB_SEC, on: 'identifier' })).to.not.exist();
                expect(findCompare({ arr: keys, compare: PUB_ONLY, on: 'identifier' })).to.not.exist();

                await deleteAllTestKeys();
            });

            it('validates deleteKey args', async () => {

                let error;

                try {
                    await Doggo.api.deleteKey({
                        badKey3: 'all',
                        fingerprint: 'abcdefghijklmnopqrstuvwxyz0123456789xxxx', // 40 chars
                        type: 'all',
                        password: 'the-doggo-did-it'
                    });
                }
                catch (err) {
                    error = err;
                }

                expect(error && error.isJoi).to.equal(true);
                expect(error.message).to.match(/"badKey3" is not allowed/);
            });

            it('deletes a public key by fingerprint and type "pub"', async () => {

                const { findCompare } = internals;

                await Doggo.api.importKey({
                    key: await getKeyForImportKey(PUB_ONLY.keyPaths.pub),
                    type: 'pub'
                });

                const keysWithPubSec = await Doggo.api.listKeys({ search: PUB_ONLY.fingerprint, type: 'pub' });
                expect(keysWithPubSec.length).to.equal(1);
                expect(findCompare({ arr: keysWithPubSec, compare: PUB_ONLY, on: 'fingerprint' })).to.exist();

                const deleteResult = await Doggo.api.deleteKey({
                    fingerprint: PUB_ONLY.fingerprint,
                    type: 'pub'
                });

                // Assert output matches API schema
                expect(() => Joi.assert(deleteResult, Schemas.api.deleteKey.response)).to.not.throw();

                expect(deleteResult).to.equal(true);

                // Assert the pub key is not able to be listed
                expect(await Doggo.api.listKeys({ fingerprint: PUB_ONLY.fingerprint, type: 'pub' }))
                    .to.not.exist(); // Poof! It's gone!

                await deleteAllTestKeys();
            });

            it('deleting a key is idempotent', async () => {

                const { findCompare } = internals;

                await Doggo.api.importKey({
                    key: await getKeyForImportKey(PUB_ONLY.keyPaths.pub),
                    type: 'pub'
                });

                const pubSec = await Doggo.api.listKeys({ fingerprint: PUB_ONLY.fingerprint, type: 'pub' });
                expect(pubSec).to.exist();
                expect(findCompare({ arr: [pubSec], compare: PUB_ONLY, on: 'fingerprint' })).to.exist();

                const deleteResult = await Doggo.api.deleteKey({
                    fingerprint: PUB_ONLY.fingerprint,
                    type: 'pub'
                });

                // Assert output matches API schema
                expect(() => Joi.assert(deleteResult, Schemas.api.deleteKey.response)).to.not.throw();

                expect(deleteResult).to.equal(true);

                // Assert the pub key is not able to be listed
                expect(await Doggo.api.listKeys({ fingerprint: PUB_ONLY.fingerprint, type: 'pub' }))
                    .to.not.exist(); // Poof! It's gone!

                /*
                 * Take two deleting and asserting
                 */
                const deleteResultTakeTwo = await Doggo.api.deleteKey({
                    fingerprint: PUB_ONLY.fingerprint,
                    type: 'pub'
                });

                // Assert output matches API schema
                expect(() => Joi.assert(deleteResultTakeTwo, Schemas.api.deleteKey.response)).to.not.throw();

                expect(deleteResultTakeTwo).to.equal(true);

                // Assert the pub key is not able to be listed
                expect(await Doggo.api.listKeys({ search: PUB_ONLY.fingerprint, type: 'pub' }))
                    .to.have.length(0); // Poof! It's still gone!

                await deleteAllTestKeys();
            });

            it('validates encrypt args', async () => {

                let error;

                try {
                    await Doggo.api.encrypt({
                        search: PUB_SEC.fingerprint
                    });
                }
                catch (err) {
                    error = err;
                }

                expect(error && error.isJoi).to.equal(true);
                expect(error.message).to.match(/"clearText" is required/);
            });

            // TODO support encryption for a passed-in public key cuz that'd be saweeeeet!
            it('encrypts PGP text for an imported public key', async () => {

                const { CLEAR_TEXT: { carKeys } } = TestKeyInfo;

                await Doggo.api.importKey({
                    key: await getKeyForImportKey(PUB_SEC.keyPaths.pub),
                    type: 'pub'
                });

                const encrypted1 = await Doggo.api.encrypt({
                    search: PUB_SEC.fingerprint,
                    clearText: carKeys
                });

                expect(() => Joi.assert(encrypted1, Schemas.api.encrypt.response)).to.not.throw();

                // This is here for now until I open things up to non-gpg implementations
                expect(encrypted1.match(/BEGIN PGP MESSAGE/)).to.exist();
                expect(encrypted1.match(/END PGP MESSAGE/)).to.exist();

                const encrypted2 = await Doggo.api.encrypt({
                    search: PUB_SEC.fingerprint,
                    clearText: carKeys
                });

                expect(() => Joi.assert(encrypted2, Schemas.api.encrypt.response)).to.not.throw();

                // The same message encrypted twice will never be equal
                expect(encrypted1).to.not.equal(encrypted2);

                // This is here for now until I open things up to non-gpg implementations
                expect(encrypted2.match(/BEGIN PGP MESSAGE/)).to.exist();
                expect(encrypted2.match(/END PGP MESSAGE/)).to.exist();

                await deleteAllTestKeys();
            });

            // TODO for encrypting
            // throw Doggo.TooManyKeysError if multiple keys found from "search"

            it('decrypts text for an imported secret key', async () => {

                const { CLEAR_TEXT: { carKeys } } = TestKeyInfo;

                await importAllKeys();

                const decrypted = await Doggo.api.decrypt({
                    cipherText: PUB_SEC.encryptedText.carKeys[0],
                    password: PUB_SEC.password
                });

                expect(() => Joi.assert(decrypted, Schemas.api.decrypt.response)).to.not.throw();

                expect(decrypted).to.equal(PUB_SEC.encryptedText.carKeys.clearText);
                expect(decrypted).to.equal(carKeys);

                await deleteAllTestKeys();
            });

            // This is an important test so it gets a star
            // *
            it('decrypts exported text for an imported secret key', async () => {

                const { CLEAR_TEXT: { carKeys } } = TestKeyInfo;

                await importAllKeys();

                const encrypted = await Doggo.api.encrypt({
                    search: PUB_SEC.fingerprint,
                    clearText: carKeys
                });

                expect(() => Joi.assert(encrypted, Schemas.api.encrypt.response)).to.not.throw();

                expect(encrypted).to.not.equal(carKeys);

                const decrypted = await Doggo.api.decrypt({
                    cipherText: encrypted,
                    password: PUB_SEC.password
                });

                expect(decrypted).to.not.equal(encrypted);
                // to "yes" equal
                expect(decrypted).to.equal(carKeys);

                await deleteAllTestKeys();
            });

            it('exports public keys', async () => {

                const { getFileContents } = internals;

                await importAllKeys();

                const pubSec = await Doggo.api.exportKeys({
                    fingerprint: PUB_SEC.fingerprint,
                    type: 'pub'
                });

                expect(() => Joi.assert(pubSec, Schemas.api.exportKeys.response)).to.not.throw();

                expect(pubSec.pub).to.equal(await getFileContents(PUB_SEC.keyPaths.pub));
                expect(pubSec.sec).to.equal(null);

                // Testing that the crypto system can derive a public key from just a secret key
                const secOnly = await Doggo.api.exportKeys({
                    fingerprint: SEC_ONLY.fingerprint,
                    type: 'pub'
                });

                expect(() => Joi.assert(secOnly, Schemas.api.exportKeys.response)).to.not.throw();

                expect(secOnly.pub).to.equal(await getFileContents(SEC_ONLY.keyPaths.pub));
                // expect(secOnly.sec).to.equal(null);

                await deleteAllTestKeys();
            });

            it('exports secret keys', async () => {

                const { getFileContents } = internals;

                await importAllKeys();

                const pubSec = await Doggo.api.exportKeys({
                    fingerprint: PUB_SEC.fingerprint,
                    type: 'sec'
                });

                expect(() => Joi.assert(pubSec, Schemas.api.exportKeys.response)).to.not.throw();

                expect(pubSec.pub).to.equal(null);
                expect(pubSec.sec).to.equal(await getFileContents(PUB_SEC.keyPaths.sec));

                // Testing that the crypto system can derive a public key from just a secret key
                const secOnly = await Doggo.api.exportKeys({
                    fingerprint: SEC_ONLY.fingerprint,
                    type: 'sec'
                });

                expect(() => Joi.assert(secOnly, Schemas.api.exportKeys.response)).to.not.throw();

                expect(secOnly.pub).to.equal(null);
                expect(secOnly.sec).to.equal(await getFileContents(SEC_ONLY.keyPaths.sec));

                await deleteAllTestKeys();
            });

            it('exports all available keys', async () => {

                const { getFileContents } = internals;

                await importAllKeys();

                const pubSec = await Doggo.api.exportKeys({
                    fingerprint: PUB_SEC.fingerprint,
                    type: 'all'
                });

                expect(() => Joi.assert(pubSec, Schemas.api.exportKeys.response)).to.not.throw();

                expect(pubSec.pub).to.equal(await getFileContents(PUB_SEC.keyPaths.pub));
                expect(pubSec.sec).to.equal(await getFileContents(PUB_SEC.keyPaths.sec));

                // Testing that the crypto system can derive a public key from just a secret key
                const secOnly = await Doggo.api.exportKeys({
                    fingerprint: SEC_ONLY.fingerprint,
                    type: 'all'
                });

                expect(() => Joi.assert(secOnly, Schemas.api.exportKeys.response)).to.not.throw();

                expect(secOnly.pub).to.equal(await getFileContents(SEC_ONLY.keyPaths.pub));
                expect(secOnly.sec).to.equal(await getFileContents(SEC_ONLY.keyPaths.sec));

                await deleteAllTestKeys();
            });
        });
    }
};

internals.findCompare = ({ arr, compare, on }) => arr.find((obj) => obj[on] === compare[on]);

internals.getFileContents = async (path) => {

    const contents = await Fs.readFile(path);
    return contents.toString('utf8');
};
