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

internals.testUtilsSchema = Joi.object({
    expect: Joi.func().required(),
    describe: Joi.func().required(),
    it: Joi.func().required()
}).required();

module.exports = class DoggoAdapterTestSuite {

    constructor(adapter, testUtils = {}) {

        Joi.assert(adapter, Schemas.adapter, 'Invalid adapter passed');

        this.adapter = adapter;
        this.doggo = require('../lib')(adapter);

        const { testUtilsSchema } = internals;

        Joi.assert(testUtils, testUtilsSchema, 'Invalid testUtils passed');

        this.testUtils = testUtils;
    }

    test() {

        const { name } = this.adapter;
        const { expect, describe, it } = this.testUtils;
        const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

        const Doggo = this.doggo;

        describe(`DoggoAdapterTestSuite: doggo adapter "${name}" tests:`, () => {

            it('imports valid keys', async () => {

                const IS_GPG = Doggo.api.name === 'gpg';

                const getFile = async (path) => {

                    const file = await Fs.readFile(path);
                    return file.toString('utf8');
                };

                const pubSecSec = await Doggo.api.importKey({
                    key: IS_GPG ? PUB_SEC.keyPaths.sec : await getFile(PUB_SEC.keyPaths.sec),
                    type: 'sec',
                    password: PUB_SEC.password
                });
                const pubSecPub = await Doggo.api.importKey({
                    key: IS_GPG ? PUB_SEC.keyPaths.pub : await getFile(PUB_SEC.keyPaths.pub),
                    type: 'pub'
                });
                const secOnlySec = await Doggo.api.importKey({
                    key: IS_GPG ? SEC_ONLY.keyPaths.sec : await getFile(SEC_ONLY.keyPaths.sec),
                    type: 'sec',
                    password: SEC_ONLY.password
                });
                const pubOnlyPub = await Doggo.api.importKey({
                    key: IS_GPG ? PUB_ONLY.keyPaths.pub : await getFile(PUB_ONLY.keyPaths.pub),
                    type: 'pub'
                });

                // PUB_SEC pub
                // Assert output matches API schema
                expect(() => Joi.assert(pubSecSec, Schemas.api.response.importKey)).to.not.throw();
                // Assert correct key info was returned
                expect(pubSecPub.fingerprint).to.equal(PUB_SEC.fingerprint);
                expect(pubSecPub.identifier).to.equal(PUB_SEC.identifier);

                // PUB_SEC sec
                // Assert output matches API schema
                expect(() => Joi.assert(pubSecPub, Schemas.api.response.importKey)).to.not.throw();
                // Assert correct key info was returned
                expect(pubSecSec.fingerprint).to.equal(PUB_SEC.fingerprint);
                expect(pubSecSec.identifier).to.equal(PUB_SEC.identifier);

                // SEC_ONLY
                // Assert output matches API schema
                expect(() => Joi.assert(secOnlySec, Schemas.api.response.importKey)).to.not.throw();
                // Assert correct key info was returned
                expect(secOnlySec.fingerprint).to.equal(SEC_ONLY.fingerprint);
                expect(secOnlySec.identifier).to.equal(SEC_ONLY.identifier);

                // PUB_ONLY
                // Assert output matches API schema
                expect(() => Joi.assert(pubOnlyPub, Schemas.api.response.importKey)).to.not.throw();
                // Assert correct key info was returned
                expect(pubOnlyPub.fingerprint).to.equal(PUB_ONLY.fingerprint);
                expect(pubOnlyPub.identifier).to.equal(PUB_ONLY.identifier);

                // Wait a couple secs for gpg to get its act together.
                // Having issues with these imported keys not showing up immediately in lists
                if (Doggo.api.name === 'gpg') {
                    return new Promise((res) => setTimeout(() => res(), 2000));
                }
            });

            // TODO
            // it('throws when importing invalid keys', async () => {

            //     // throw Doggo.InvalidKeyError
            // });

            it('lists all keys for type "all"', async () => {

                const { find } = internals;

                const keys = await Doggo.api.listKeys({ type: 'all' });

                // Assert output matches API schema
                expect(() => Joi.assert(keys, Schemas.api.response.listKeys)).to.not.throw();

                // Might have other keys on the keychain
                expect(keys.length).to.be.at.least(3);

                expect(find({ arr: keys, compareWith: PUB_SEC, key: 'fingerprint' })).to.exist();
                expect(find({ arr: keys, compareWith: PUB_ONLY, key: 'fingerprint' })).to.exist();
                expect(find({ arr: keys, compareWith: SEC_ONLY, key: 'fingerprint' })).to.exist();
            });

            it('lists all keys if passed no options', async () => {

                const { find } = internals;

                const keys = await Doggo.api.listKeys();

                // Assert output matches API schema
                expect(() => Joi.assert(keys, Schemas.api.response.listKeys)).to.not.throw();

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

            it('lists keys by type', async () => {

                const { find } = internals;

                const pub = await Doggo.api.listKeys({ type: 'pub' });
                const sec = await Doggo.api.listKeys({ type: 'sec' });

                // Assert output matches API schema
                expect(() => Joi.assert(pub, Schemas.api.response.listKeys)).to.not.throw();
                expect(() => Joi.assert(sec, Schemas.api.response.listKeys)).to.not.throw();

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

                expect(() => Joi.assert(keys, Schemas.api.response.listKeys)).to.not.throw();

                expect(find({ arr: keys, compareWith: PUB_SEC, key: 'fingerprint' })).to.exist();
                // NOTE: to.not.exist()
                expect(find({ arr: keys, compareWith: SEC_ONLY, key: 'fingerprint' })).to.not.exist();
                expect(find({ arr: keys, compareWith: PUB_ONLY, key: 'fingerprint' })).to.not.exist();
            });

            it('finds a key by identifier', async () => {

                const { find } = internals;

                const keys = await Doggo.api.listKeys({ search: SEC_ONLY.identifier });

                expect(() => Joi.assert(keys, Schemas.api.response.listKeys)).to.not.throw();

                expect(find({ arr: keys, compareWith: SEC_ONLY, key: 'identifier' })).to.exist();
                // NOTE: to.not.exist()
                expect(find({ arr: keys, compareWith: PUB_SEC, key: 'identifier' })).to.not.exist();
                expect(find({ arr: keys, compareWith: PUB_ONLY, key: 'identifier' })).to.not.exist();
            });

            // This test is important
            it('encrypts text for an imported secret key', async () => {
                /*
                 *   Sry I can't remember where I
                 *   buried ur car keys I'm just a pup
                 */
                const { CLEAR_TEXT: { carKeys } } = TestKeyInfo;

                const encrypted1 = await Doggo.api.encrypt({
                    search: PUB_SEC.fingerprint,
                    clearText: carKeys
                });

                // This is here for now until I open things up to non-gpg implementations
                expect(encrypted1.match(/BEGIN PGP MESSAGE/)).to.exist();
                expect(encrypted1.match(/END PGP MESSAGE/)).to.exist();

                const encrypted2 = await Doggo.api.encrypt({
                    search: PUB_SEC.fingerprint,
                    clearText: carKeys
                });

                expect(encrypted1).to.not.equal(encrypted2);

                // This is here for now until I open things up to non-gpg implementations
                expect(encrypted2.match(/BEGIN PGP MESSAGE/)).to.exist();
                expect(encrypted2.match(/END PGP MESSAGE/)).to.exist();
            });

            // TODO

            // Test searching for something that matches multiple keys
            // Want to get Doggo.TooManyKeysError to throw if multiple keys found from "search"


            /////////////////


            // it('encrypts and decrypts text for a user', async () => {

            //     const srcFile = __dirname + '/secures/plaintext.txt';
            //     const destFile = __dirname + '/secures/plaintext.gpg';
            //     const decryptPath = __dirname + '/secures/plaintext.gpg.decrypt';

            //     await Doggo.api.encrypt(PUB_SEC.identifier, srcFile, destFile);

            //     const plaintext = await Fs.readFile(srcFile);
            //     const encrypted = await Fs.readFile(destFile);

            //     // Pretty naiive check but meh I'm just a doggo
            //     // How do you check if something looks encrypted?
            //     const encryptedToString = encrypted.toString('utf8');

            //     expect(encryptedToString).to.not.equal(plaintext.toString('utf8'));

            //     if (Doggo.adapter.name === 'gpg') {
            //         expect(encryptedToString).to.include('-----BEGIN PGP MESSAGE-----');
            //         expect(encryptedToString).to.include('-----END PGP MESSAGE-----');
            //     }

            //     await Doggo.api.decrypt(destFile, decryptPath, 'test');

            //     const decrypted = await Fs.readFile(decryptPath);
            //     expect(decrypted.toString('utf8')).to.equal(plaintext.toString('utf8'));
            // });

            // it('exports keys', async (done) => {

            //     // pub
            //     const poPublicKey = await Fs.readFile(__dirname + '/secures/keys/pubOnly.pub');

            //     const pubExportKeyPath = `${__dirname}/secures/keys/test.pub`;
            //     await Doggo.api.exportKey(PUB_ONLY.fingerprint, 'pub', pubExportKeyPath);

            //     const exportedPublicKey = await Fs.readFile(pubExportKeyPath);

            //     expect(exportedPublicKey.toString('utf8')).to.equal(poPublicKey.toString('utf8'));

            //     // sec
            //     const secExportKeyPath = `${__dirname}/secures/keys/test.sec`;
            //     await Doggo.api.exportKey(SEC_ONLY.identifier, 'sec', secExportKeyPath, 'test');

            //     const exportedSecretKey = await Fs.readFile(secExportKeyPath);

            //     // Secret keys are symmetrically encrypted by gpg when exported for protection.
            //     if (Doggo.adapter.name === 'gpg') {
            //         expect(exportedSecretKey.toString('utf8')).to.include('-----BEGIN PGP PRIVATE KEY BLOCK-----');
            //         expect(exportedSecretKey.toString('utf8')).to.include('-----END PGP PRIVATE KEY BLOCK-----');
            //     }
            // });

            // it('deletes keys', async () => {

            //     const { pub: beginPub, sec: beginSec } = await Doggo.api.listKeys();

            //     const beginPubOnlyPubKeyExists = Doggo.api.keyExists(PUB_ONLY.fingerprint, beginPub);
            //     const beginPubOnlySecKeyExists = Doggo.api.keyExists(PUB_ONLY.fingerprint, beginSec);
            //     const beginSecOnlyPubKeyExists = Doggo.api.keyExists(SEC_ONLY.fingerprint, beginPub);
            //     const beginSecOnlySecKeyExists = Doggo.api.keyExists(SEC_ONLY.fingerprint, beginSec);
            //     const beginPubSecPubKeyExists = Doggo.api.keyExists(PUB_SEC.fingerprint, beginPub);
            //     const beginPubSecSecKeyExists = Doggo.api.keyExists(PUB_SEC.fingerprint, beginSec);

            //     expect(beginPubOnlyPubKeyExists).to.equal(true);
            //     expect(beginPubOnlySecKeyExists).to.equal(false);
            //     // Importing a secret key automatically imports the public key
            //     expect(beginSecOnlyPubKeyExists).to.equal(true);
            //     expect(beginSecOnlySecKeyExists).to.equal(true);
            //     expect(beginPubSecPubKeyExists).to.equal(true);
            //     expect(beginPubSecSecKeyExists).to.equal(true);

            //     // Delete 'em

            //     await Doggo.api.deleteKeys(PUB_ONLY.fingerprint, 'pub');
            //     await Doggo.api.deleteKeys(SEC_ONLY.fingerprint, 'all');

            //     // Trying to delete a public key before a secret key throws an error in gpg
            //     await Doggo.api.deleteKeys(PUB_SEC.fingerprint, 'sec');
            //     await Doggo.api.deleteKeys(PUB_SEC.fingerprint, 'pub');

            //     // Check lists

            //     const { pub: afterDeletePub, sec: afterDeleteSec } = await Doggo.api.listKeys();

            //     const afterDeletePubOnlyPubKeyExists = Doggo.api.keyExists(PUB_ONLY.fingerprint, afterDeletePub);
            //     const afterDeletePubOnlySecKeyExists = Doggo.api.keyExists(PUB_ONLY.fingerprint, afterDeleteSec);
            //     const afterDeleteSecOnlyPubKeyExists = Doggo.api.keyExists(SEC_ONLY.fingerprint, afterDeletePub);
            //     const afterDeleteSecOnlySecKeyExists = Doggo.api.keyExists(SEC_ONLY.fingerprint, afterDeleteSec);
            //     const afterDeletePubSecPubKeyExists = Doggo.api.keyExists(PUB_SEC.fingerprint, afterDeletePub);
            //     const afterDeletePubSecSecKeyExists = Doggo.api.keyExists(PUB_SEC.fingerprint, afterDeleteSec);

            //     expect(afterDeletePubOnlyPubKeyExists).to.equal(false);
            //     expect(afterDeletePubOnlySecKeyExists).to.equal(false);
            //     expect(afterDeleteSecOnlyPubKeyExists).to.equal(false);
            //     expect(afterDeleteSecOnlySecKeyExists).to.equal(false);
            //     expect(afterDeletePubSecPubKeyExists).to.equal(false);
            //     expect(afterDeletePubSecSecKeyExists).to.equal(false);
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
