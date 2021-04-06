'use strict';

const { promises: Fs } = require('fs');

const Joi = require('joi');

const Schemas = require('../lib/schema');
const TestKeyInfo = require('./test-key-info');

// const InvalidKeyError = require('../lib/errors/InvalidKeyError');
// const TooManyKeysError = require('../lib/errors/TooManyKeysError');

const internals = {};

// TODO clear gpg cache before these tests
// TODO move this TODO comment to doggo-adapter-gpg
// Run 'gpgconf --kill gpg-agent'

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

        const getKeyForImport = async (path) => {

            return IS_GPG ? path : await getFile(path);
        };

        const importAllKeys = async () => {

            const pubSecSec = await Doggo.api.importKey({
                key: await getKeyForImport(PUB_SEC.keyPaths.sec),
                type: 'sec',
                password: PUB_SEC.password
            });

            const pubSecPub = await Doggo.api.importKey({
                key: await getKeyForImport(PUB_SEC.keyPaths.pub),
                type: 'pub'
            });

            const secOnlySec = await Doggo.api.importKey({
                key: await getKeyForImport(SEC_ONLY.keyPaths.sec),
                type: 'sec',
                password: SEC_ONLY.password
            });

            const pubOnlyPub = await Doggo.api.importKey({
                key: await getKeyForImport(PUB_ONLY.keyPaths.pub),
                type: 'pub'
            });

            return {
                pubSecSec,
                pubSecPub,
                secOnlySec,
                pubOnlyPub
            };
        };

        describe(`DoggoAdapterTestSuite: doggo adapter "${name}" tests:`, () => {

            it('imports valid keys', async () => {

                const {
                    pubSecSec,
                    pubSecPub,
                    secOnlySec,
                    pubOnlyPub
                } = await importAllKeys();

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

                // // Wait a couple secs for gpg to get its act together.
                // // Having issues with these imported keys not showing up immediately in lists
                // if (Doggo.api.name === 'gpg') {
                //     return new Promise((res) => setTimeout(() => res(), 2000));
                // }
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

                // // Wait a couple secs for gpg to get its act together.
                // // Having issues with these imported keys not showing up immediately in lists
                // if (Doggo.api.name === 'gpg') {
                //     return new Promise((res) => setTimeout(() => res(), 2000));
                // }
            });

            // TODO
            // it('throws when importing invalid keys', async () => {

            //     // throw Doggo.InvalidKeyError
            // });

            it('lists all keys for type "all"', async () => {

                const { find } = internals;

                const keys = await Doggo.api.listKeys({ type: 'all' });

                // Assert output matches API schema
                expect(() => Joi.assert(keys, Schemas.api.listKeys.response)).to.not.throw();

                // Might have other keys on the keychain
                expect(keys.length).to.be.at.least(3);

                expect(find({ arr: keys, compareWith: PUB_SEC, key: 'fingerprint' })).to.exist();
                expect(find({ arr: keys, compareWith: PUB_ONLY, key: 'fingerprint' })).to.exist();
                expect(find({ arr: keys, compareWith: SEC_ONLY, key: 'fingerprint' })).to.exist();
            });

            it('lists "all" keys if passed no options', async () => {

                const { find } = internals;

                const keys = await Doggo.api.listKeys();

                // Assert output matches API schema
                expect(() => Joi.assert(keys, Schemas.api.listKeys.response)).to.not.throw();

                // Might have other keys on the keychain
                expect(keys.length).to.be.at.least(3);

                expect(find({ arr: keys, compareWith: PUB_SEC, key: 'fingerprint' })).to.exist();
                expect(find({ arr: keys, compareWith: PUB_ONLY, key: 'fingerprint' })).to.exist();
                expect(find({ arr: keys, compareWith: SEC_ONLY, key: 'fingerprint' })).to.exist();
                // A quick test for the util's benefit
                expect(find({ arr: keys, compareWith: { fingerprint: 'pups-r-gonna-be-pups' }, key: 'fingerprint' })).to.not.exist();
            });

            // TODO
            // it('throws if invalid "type" is passed to listKeys', async () => {

            //     TODO have it throw a Doggo error =)
            // });

            it('lists keys that have public keys for type "pub"', async () => {

                const { find } = internals;

                const pub = await Doggo.api.listKeys({ type: 'pub' });
                const sec = await Doggo.api.listKeys({ type: 'sec' });

                // Assert output matches API schema
                expect(() => Joi.assert(pub, Schemas.api.listKeys.response)).to.not.throw();
                expect(() => Joi.assert(sec, Schemas.api.listKeys.response)).to.not.throw();

                expect(find({ arr: pub, compareWith: PUB_SEC, key: 'fingerprint' })).to.exist();
                // Public keys can always be derived from secret keys
                expect(find({ arr: pub, compareWith: SEC_ONLY, key: 'fingerprint' })).to.exist();
                expect(find({ arr: pub, compareWith: PUB_ONLY, key: 'fingerprint' })).to.exist();

                expect(find({ arr: sec, compareWith: PUB_SEC, key: 'fingerprint' })).to.exist();
                expect(find({ arr: sec, compareWith: SEC_ONLY, key: 'fingerprint' })).to.exist();
                // NOTE: to.not.exist for the PUB_ONLY key
                expect(find({ arr: sec, compareWith: PUB_ONLY, key: 'fingerprint' })).to.not.exist();
            });

            it('lists keys that have secret keys for type "sec", does not export them', async () => {

                const { find } = internals;

                const pub = await Doggo.api.listKeys({ type: 'pub' });
                const sec = await Doggo.api.listKeys({ type: 'sec' });

                // Assert output matches API schema
                expect(() => Joi.assert(pub, Schemas.api.listKeys.response)).to.not.throw();
                expect(() => Joi.assert(sec, Schemas.api.listKeys.response)).to.not.throw();

                expect(find({ arr: pub, compareWith: PUB_SEC, key: 'fingerprint' })).to.exist();
                // Public keys can always be derived from secret keys
                expect(find({ arr: pub, compareWith: SEC_ONLY, key: 'fingerprint' })).to.exist();
                expect(find({ arr: pub, compareWith: PUB_ONLY, key: 'fingerprint' })).to.exist();

                expect(find({ arr: sec, compareWith: PUB_SEC, key: 'fingerprint' })).to.exist();
                expect(find({ arr: sec, compareWith: SEC_ONLY, key: 'fingerprint' })).to.exist();
                // NOTE: to.not.exist for the PUB_ONLY key
                expect(find({ arr: sec, compareWith: PUB_ONLY, key: 'fingerprint' })).to.not.exist();
            });

            it('finds a key by fingerprint', async () => {

                const { find } = internals;

                const keys = await Doggo.api.listKeys({ search: PUB_SEC.fingerprint });

                expect(() => Joi.assert(keys, Schemas.api.listKeys.response)).to.not.throw();

                expect(find({ arr: keys, compareWith: PUB_SEC, key: 'fingerprint' })).to.exist();
                // NOTE: to.not.exist()
                expect(find({ arr: keys, compareWith: SEC_ONLY, key: 'fingerprint' })).to.not.exist();
                expect(find({ arr: keys, compareWith: PUB_ONLY, key: 'fingerprint' })).to.not.exist();
            });

            it('finds a key by identifier', async () => {

                const { find } = internals;

                const keys = await Doggo.api.listKeys({ search: SEC_ONLY.identifier });

                expect(() => Joi.assert(keys, Schemas.api.listKeys.response)).to.not.throw();

                expect(find({ arr: keys, compareWith: SEC_ONLY, key: 'identifier' })).to.exist();
                // NOTE: to.not.exist()
                expect(find({ arr: keys, compareWith: PUB_SEC, key: 'identifier' })).to.not.exist();
                expect(find({ arr: keys, compareWith: PUB_ONLY, key: 'identifier' })).to.not.exist();
            });

            // TODO support encryption for a passed-in public key cuz that'd be saweeeeet!
            it('encrypts PGP text for an imported secret key', async () => {

                //

                /*
                 *   Sry I can't remember where I
                 *   buried ur car keys I'm just a pup
                 */
                const { CLEAR_TEXT: { carKeys } } = TestKeyInfo;

                const encrypted1 = await Doggo.api.encrypt({
                    for: PUB_SEC.fingerprint,
                    clearText: carKeys
                });

                expect(() => Joi.assert(encrypted1, Schemas.api.encrypt.response)).to.not.throw();

                // This is here for now until I open things up to non-gpg implementations
                expect(encrypted1.match(/BEGIN PGP MESSAGE/)).to.exist();
                expect(encrypted1.match(/END PGP MESSAGE/)).to.exist();

                const encrypted2 = await Doggo.api.encrypt({
                    for: PUB_SEC.fingerprint,
                    clearText: carKeys
                });

                expect(() => Joi.assert(encrypted2, Schemas.api.encrypt.response)).to.not.throw();

                // The same message encrypted twice will never be equal
                expect(encrypted1).to.not.equal(encrypted2);

                // This is here for now until I open things up to non-gpg implementations
                expect(encrypted2.match(/BEGIN PGP MESSAGE/)).to.exist();
                expect(encrypted2.match(/END PGP MESSAGE/)).to.exist();
            });

            // TODO for encrypting
            // throw Doggo.TooManyKeysError if multiple keys found from "search"

            it('decrypts text for an imported secret key', async () => {
                /*
                 *   Sry I can't remember where I
                 *   buried ur car keys I'm just a pup
                 */
                const { CLEAR_TEXT: { carKeys } } = TestKeyInfo;

                const decrypted = await Doggo.api.decrypt({
                    text: PUB_SEC.encryptedText.carKeys[0],
                    password: PUB_SEC.password
                });

                expect(() => Joi.assert(decrypted, Schemas.api.decrypt.response)).to.not.throw();

                expect(decrypted).to.equal(PUB_SEC.encryptedText.carKeys.clearText);
                expect(decrypted).to.equal(carKeys);
            });

            // This is an important test so it gets a star
            // *
            it('decrypts exported text for an imported secret key', async () => {
                /*
                 *   Sry I can't remember where I
                 *   buried ur car keys I'm just a pup
                 */
                const { CLEAR_TEXT: { carKeys } } = TestKeyInfo;

                const encrypted = await Doggo.api.encrypt({
                    for: PUB_SEC.fingerprint,
                    clearText: carKeys
                });

                expect(() => Joi.assert(encrypted, Schemas.api.encrypt.response)).to.not.throw();

                expect(encrypted).to.not.equal(carKeys);

                const decrypted = await Doggo.api.decrypt({
                    text: encrypted,
                    password: PUB_SEC.password
                });

                expect(decrypted).to.not.equal(encrypted);
                // to.yes.equal
                expect(decrypted).to.equal(carKeys);
            });

            it('exports public keys', async (done) => {

                const { getFileContents } = internals;

                const [pubSec] = await Doggo.api.exportKeys({
                    search: PUB_SEC.fingerprint,
                    type: 'pub'
                });

                expect(() => Joi.assert(pubSec, Schemas.api.exportKeys.response)).to.not.throw();

                expect(pubSec.pub).to.equal(await getFileContents(PUB_SEC.keyPaths.pub));
                expect(pubSec.sec).to.equal(null);

                // Testing that the crypto system can derive a public key from just a secret key
                const [secOnly] = await Doggo.api.exportKeys({
                    search: SEC_ONLY.fingerprint,
                    type: 'pub'
                });

                expect(() => Joi.assert(secOnly, Schemas.api.exportKeys.response)).to.not.throw();

                expect(secOnly.pub).to.equal(await getFileContents(SEC_ONLY.keyPaths.pub));
                expect(secOnly.sec).to.equal(null);
            });

            it('exports secret keys', async (done) => {

                const { getFileContents } = internals;

                const [pubSec] = await Doggo.api.exportKeys({ search: PUB_SEC.fingerprint, type: 'sec' });

                expect(() => Joi.assert(pubSec, Schemas.api.exportKeys.response)).to.not.throw();

                expect(pubSec.pub).to.equal(null);
                expect(pubSec.sec).to.equal(await getFileContents(PUB_SEC.keyPaths.sec));

                // Testing that the crypto system can derive a public key from just a secret key
                const [secOnly] = await Doggo.api.exportKeys({ search: SEC_ONLY.fingerprint, type: 'sec' });

                expect(() => Joi.assert(secOnly, Schemas.api.exportKeys.response)).to.not.throw();

                expect(secOnly.pub).to.equal(null);
                expect(secOnly.sec).to.equal(await getFileContents(SEC_ONLY.keyPaths.sec));
            });

            it('exports all available keys', async (done) => {

                const { getFileContents } = internals;

                const [pubSec] = await Doggo.api.exportKeys({ search: PUB_SEC.fingerprint, type: 'all' });

                expect(() => Joi.assert(pubSec, Schemas.api.exportKeys.response)).to.not.throw();

                expect(pubSec.pub).to.equal(await getFileContents(PUB_SEC.keyPaths.pub));
                expect(pubSec.sec).to.equal(await getFileContents(PUB_SEC.keyPaths.sec));

                // Testing that the crypto system can derive a public key from just a secret key
                const [secOnly] = await Doggo.api.exportKeys({ search: SEC_ONLY.fingerprint, type: 'all' });

                expect(() => Joi.assert(secOnly, Schemas.api.exportKeys.response)).to.not.throw();

                expect(secOnly.pub).to.equal(await getFileContents(SEC_ONLY.keyPaths.pub));
                expect(secOnly.sec).to.equal(await getFileContents(SEC_ONLY.keyPaths.sec));
            });

            // it('deletes a key by fingerprint', async () => {

            //     // TODO import the keys tested in this test

            //     const deleteSuccessful = await Doggo.api.deleteKey({
            //         for: PUB_SEC.fingerprint
            //     });

            //     expect(() => Joi.assert(deleteSuccessful, Schemas.api.deleteKey.response)).to.not.throw();

            //     expect(deleteSuccessful).to.be.true();

            //     //
            // });
        });
    }
};

internals.safeUnlink = async (unlinkPath) => {

    if (await Fs.exists(unlinkPath)) {
        await Fs.unlink(unlinkPath);
    }
};

internals.genKeys = async (Doggo, ...args) => await Doggo.api.genKeys(...args);

internals.first = (arr) => arr[0];

internals.find = ({ arr, compareWith, key }) => arr.find((obj) => obj[key] === compareWith[key]);

internals.randomNumberNoDot = () => String(Math.random()).replace('.', '');

internals.extractFingerprintFromCreationSuccessMessage = async (Doggo, msg) => {

    const [, res] = await Doggo.api.getFingerprint(msg.split(' key ')[1].split(' ')[0]);
    return res[0].fingerprint;
};

internals.isCI = () => process.env.TRAVIS || process.env.CI;

internals.getFileContents = async (path) => {

    const contents = await Fs.readFile(path);
    return contents.toString('utf8');
};
