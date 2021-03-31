'use strict';

const { promises: Fs } = require('fs');

const Joi = require('joi');

const Schemas = require('../lib/schema');
const TestKeyInfo = require('./test-key-info');

const internals = {};

// TODO clear gpg cache before these tests
// Run 'gpgconf --kill gpg-agent'

// TODO normalize adapter output to something like
// { output, fingerprints, ...etc }

internals.testUtilsSchema = Joi.object({
    expect: Joi.func().required(),
    lab: Joi.object({
        describe: Joi.func().required(),
        it: Joi.func().required()
    }).required()
});

module.exports = class DoggoAdapterTestSuite {

    constructor(adapter, testUtils = {}) {

        Joi.assert(adapter, Schemas.adapter, 'Invalid adapter passed');

        this.adapter = adapter;
        this.doggo = require('../lib')(adapter);

        const { testUtilsSchema } = internals;

        Joi.assert(testUtils, testUtilsSchema, 'Invalid testUtils passed');

        this.testUtils = testUtils;
    }

    genAndRunTests() {

        const { name } = this.adapter;
        const { expect, lab: { describe, it } } = this.testUtils;
        const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

        const Doggo = this.doggo;

        describe(`DoggoAdapterTestSuite: doggo adapter "${name}" tests:`, () => {

            it('imports valid keys', async () => {

                const IS_GPG = Doggo.api.name === 'gpg';

                const getFile = async (path) => {

                    const file = await Fs.readFile(path);
                    return file.toString('utf8');
                };

                const pubAndSecSecKeyImportRes = await Doggo.api.importKey({
                    key: IS_GPG ? PUB_SEC.keyPaths.sec : await getFile(PUB_SEC.keyPaths.sec),
                    type: 'sec',
                    password: PUB_SEC.password
                });
                const pubAndSecPubKeyImportRes = await Doggo.api.importKey({
                    key: IS_GPG ? PUB_SEC.keyPaths.pub : await getFile(PUB_SEC.keyPaths.pub),
                    type: 'pub'
                });
                const secOnlySecKeyImportRes = await Doggo.api.importKey({
                    key: IS_GPG ? SEC_ONLY.keyPaths.sec : await getFile(SEC_ONLY.keyPaths.sec),
                    type: 'sec',
                    password: SEC_ONLY.password
                });
                const pubOnlyPubKeyImportRes = await Doggo.api.importKey({
                    key: IS_GPG ? PUB_ONLY.keyPaths.pub : await getFile(PUB_ONLY.keyPaths.pub),
                    type: 'pub'
                });

                // PUB_SEC pub
                expect(() => Joi.assert(pubAndSecSecKeyImportRes, Schemas.keysInfo)).to.not.throw();
                expect(pubAndSecSecKeyImportRes.fingerprint).to.equal(PUB_SEC.fingerprint);
                expect(pubAndSecSecKeyImportRes.identifier).to.equal(PUB_SEC.identifier);

                // PUB_SEC sec
                expect(() => Joi.assert(pubAndSecPubKeyImportRes, Schemas.keysInfo)).to.not.throw();
                expect(pubAndSecPubKeyImportRes.fingerprint).to.equal(PUB_SEC.fingerprint);
                expect(pubAndSecPubKeyImportRes.identifier).to.equal(PUB_SEC.identifier);

                // SEC_ONLY
                expect(() => Joi.assert(secOnlySecKeyImportRes, Schemas.keysInfo)).to.not.throw();
                expect(secOnlySecKeyImportRes.fingerprint).to.equal(SEC_ONLY.fingerprint);
                expect(secOnlySecKeyImportRes.identifier).to.equal(SEC_ONLY.identifier);

                // PUB_ONLY
                expect(() => Joi.assert(pubOnlyPubKeyImportRes, Schemas.keysInfo)).to.not.throw();
                expect(pubOnlyPubKeyImportRes.fingerprint).to.equal(PUB_ONLY.fingerprint);
                expect(pubOnlyPubKeyImportRes.identifier).to.equal(PUB_ONLY.identifier);

                // Wait a couple secs for gpg to get its act together.
                // Having issues with these imported keys not showing up immediately in lists
                if (Doggo.api.name === 'gpg') {
                    return new Promise((res) => setTimeout(() => res(), 2000));
                }
            });

            it('lists all keys for type "all"', async () => {

                const allKeys = await Doggo.api.listKeys({ type: 'all' });

                expect(() => Joi.assert(allKeys, Schemas.keysInfo)).to.not.throw();

                // Might have other keys on the keychain
                expect(allKeys.length).to.be.at.least(3);

                expect(allKeys.find(({ fingerprint }) => fingerprint === PUB_SEC.fingerprint)).to.exist();
                expect(allKeys.find(({ fingerprint }) => fingerprint === PUB_ONLY.fingerprint)).to.exist();
                expect(allKeys.find(({ fingerprint }) => fingerprint === SEC_ONLY.fingerprint)).to.exist();
            });

            it('lists all keys given no options', async () => {

                const noOptions = await Doggo.api.listKeys();

                expect(() => Joi.assert(noOptions, Schemas.keysInfo)).to.not.throw();

                // Might have other keys on the keychain
                expect(noOptions.length).to.be.at.least(3);

                expect(noOptions.find(({ fingerprint }) => fingerprint === PUB_SEC.fingerprint)).to.exist();
                expect(noOptions.find(({ fingerprint }) => fingerprint === PUB_ONLY.fingerprint)).to.exist();
                expect(noOptions.find(({ fingerprint }) => fingerprint === SEC_ONLY.fingerprint)).to.exist();
            });

            it('lists keys by type', async () => {

                const pubKeys = await Doggo.api.listKeys({ type: 'pub' });
                const secKeys = await Doggo.api.listKeys({ type: 'sec' });

                expect(() => Joi.assert(pubKeys, Schemas.keysInfo)).to.not.throw();
                expect(() => Joi.assert(secKeys, Schemas.keysInfo)).to.not.throw();

                expect(pubKeys.find(({ fingerprint }) => fingerprint === PUB_SEC.fingerprint)).to.exist();
                // Public keys can always be derived from secret keys
                expect(pubKeys.find(({ fingerprint }) => fingerprint === SEC_ONLY.fingerprint)).to.exist();
                expect(pubKeys.find(({ fingerprint }) => fingerprint === PUB_ONLY.fingerprint)).to.exist();

                expect(secKeys.find(({ fingerprint }) => fingerprint === PUB_SEC.fingerprint)).to.exist();
                expect(secKeys.find(({ fingerprint }) => fingerprint === SEC_ONLY.fingerprint)).to.exist();
                // NOTE: to.not.exist for the PUB_ONLY key
                expect(secKeys.find(({ fingerprint }) => fingerprint === PUB_ONLY.fingerprint)).to.not.exist();
            });

            // it('checks if a key exists for a keyIdentifier', async () => {

            //     const { pub, sec } = await Doggo.api.listKeys();

            //     const poPubExists = await Doggo.api.keyExists(PUB_ONLY.identifier, pub);
            //     const poSecexists = await Doggo.api.keyExists(PUB_ONLY.identifier, sec);

            //     const psPubExists = await Doggo.api.keyExists(PUB_SEC.identifier, pub);
            //     const psSecExists = await Doggo.api.keyExists(PUB_SEC.identifier, sec);

            //     expect(poPubExists).to.equal(true);
            //     expect(poSecexists).to.equal(false);

            //     expect(psPubExists).to.equal(true);
            //     expect(psSecExists).to.equal(true);
            // });

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

internals.randomNumberNoDot = () => String(Math.random()).replace('.', '');

internals.extractFingerprintFromCreationSuccessMessage = async (Doggo, msg) => {

    const [, res] = await Doggo.api.getFingerprint(msg.split(' key ')[1].split(' ')[0]);
    return res[0].fingerprint;
};

internals.isCI = () => process.env.TRAVIS || process.env.CI;
