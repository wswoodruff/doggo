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
        this.doggoCore = require('../lib')(adapter);

        const { testUtilsSchema } = internals;

        Joi.assert(testUtils, testUtilsSchema, 'Invalid testUtils passed');

        this.testUtils = testUtils;
    }

    genAndRunTests() {

        const { name } = this.adapter;
        const { expect, lab: { describe, it } } = this.testUtils;
        const { KEYS: { PUB_SEC, SEC_ONLY, PUB_ONLY } } = TestKeyInfo;

        const DoggoCore = this.doggoCore;

        describe(`doggo adapter "${name}" tests:`, () => {

            it('imports valid keys', async () => {

                const IS_GPG = DoggoCore.api.name === 'gpg';

                await Fs.readFile(SEC_ONLY.keyPaths.sec)

                const pubAndSecSecKeyImportRes = await DoggoCore.api.importKey({
                    key: IS_GPG ? PUB_SEC.keyPaths.sec : (await Fs.readFile(PUB_SEC.keyPaths.sec)).toString('utf8'),
                    type: 'sec',
                    password: PUB_SEC.password
                });
                const pubAndSecPubKeyImportRes = await DoggoCore.api.importKey({
                    key: IS_GPG ? PUB_SEC.keyPaths.pub : (await Fs.readFile(PUB_SEC.keyPaths.pub)).toString('utf8'),
                    type: 'pub'
                });
                const secOnlySecKeyImportRes = await DoggoCore.api.importKey({
                    key: IS_GPG ? SEC_ONLY.keyPaths.sec : (await Fs.readFile(SEC_ONLY.keyPaths.sec)).toString('utf8'),
                    type: 'sec',
                    password: SEC_ONLY.password
                });
                const pubOnlyPubKeyImportRes = await DoggoCore.api.importKey({
                    key: IS_GPG ? PUB_ONLY.keyPaths.pub : (await Fs.readFile(PUB_ONLY.keyPaths.pub)).toString('utf8'),
                    type: 'pub'
                });

                // PUB_SEC pub
                expect(() => Joi.assert(pubAndSecSecKeyImportRes, Schemas.keyInfo)).to.not.throw();
                expect(pubAndSecSecKeyImportRes.fingerprint).to.equal(PUB_SEC.fingerprint);
                expect(pubAndSecSecKeyImportRes.identifier).to.equal(PUB_SEC.identifier);

                // PUB_SEC sec
                expect(() => Joi.assert(pubAndSecPubKeyImportRes, Schemas.keyInfo)).to.not.throw();
                expect(pubAndSecPubKeyImportRes.fingerprint).to.equal(PUB_SEC.fingerprint);
                expect(pubAndSecPubKeyImportRes.identifier).to.equal(PUB_SEC.identifier);

                // SEC_ONLY
                expect(() => Joi.assert(secOnlySecKeyImportRes, Schemas.keyInfo)).to.not.throw();
                expect(secOnlySecKeyImportRes.fingerprint).to.equal(SEC_ONLY.fingerprint);
                expect(secOnlySecKeyImportRes.identifier).to.equal(SEC_ONLY.identifier);

                // PUB_ONLY
                expect(() => Joi.assert(pubOnlyPubKeyImportRes, Schemas.keyInfo)).to.not.throw();
                expect(pubOnlyPubKeyImportRes.fingerprint).to.equal(PUB_ONLY.fingerprint);
                expect(pubOnlyPubKeyImportRes.identifier).to.equal(PUB_ONLY.identifier);

                // Wait a couple secs for gpg to get its act together.
                // Having issues with these imported keys not showing up immediately in lists
                if (DoggoCore.api.name === 'gpg') {
                    return new Promise((res) => setTimeout(() => res(), 2000));
                }
            });

            // it('lists keys by type', async () => {

            //     // const { output: pubKeys } = await DoggoCore.api.listKeys({ type: 'pub' });
            //     // const secKeys = await DoggoCore.api.listKeys({ type: 'sec' });
            //     // const allKeys = await DoggoCore.api.listKeys();
            // });

            it('lists keys', async () => {

                const pubKeys = await DoggoCore.api.listKeys({ type: 'pub' });
                const secKeys = await DoggoCore.api.listKeys({ type: 'sec' });
                const allKeys = await DoggoCore.api.listKeys({ type: 'all' });
                const noOptions = await DoggoCore.api.listKeys();

                // TODO getfirst via await DoggoCore.api.listKeys({ key: someFingerprint, first: true });

                expect(() => Joi.assert(pubKeys, Joi.array().items(Schemas.keys))).to.not.throw();
                expect(() => Joi.assert(secKeys, Joi.array().items(Schemas.keys))).to.not.throw();
                expect(() => Joi.assert(allKeys, Joi.array().items(Schemas.keys))).to.not.throw();
                expect(() => Joi.assert(noOptions, Joi.array().items(Schemas.keys))).to.not.throw();

                const { pub, sec } = allKeys;

                expect(pub).to.equal(pubKeys.pub);
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

                const plaintext = await Fs.readFile(srcFile);
                const encrypted = await Fs.readFile(destFile);

                // Pretty naiive check but meh I'm just a doggo
                // How do you check if something looks encrypted?
                const encryptedToString = encrypted.toString('utf8');

                expect(encryptedToString).to.not.equal(plaintext.toString('utf8'));

                if (DoggoCore.adapter.name === 'gpg') {
                    expect(encryptedToString).to.include('-----BEGIN PGP MESSAGE-----');
                    expect(encryptedToString).to.include('-----END PGP MESSAGE-----');
                }

                await DoggoCore.api.decrypt(destFile, decryptPath, 'test');

                const decrypted = await Fs.readFile(decryptPath);
                expect(decrypted.toString('utf8')).to.equal(plaintext.toString('utf8'));
            });

            it('exports keys', async (done) => {

                // pub
                const poPublicKey = await Fs.readFile(__dirname + '/secures/keys/pubOnly.pub');

                const pubExportKeyPath = `${__dirname}/secures/keys/test.pub`;
                await DoggoCore.api.exportKey(PUB_ONLY.fingerprint, 'pub', pubExportKeyPath);

                const exportedPublicKey = await Fs.readFile(pubExportKeyPath);

                expect(exportedPublicKey.toString('utf8')).to.equal(poPublicKey.toString('utf8'));

                // sec
                const secExportKeyPath = `${__dirname}/secures/keys/test.sec`;
                await DoggoCore.api.exportKey(SEC_ONLY.identifier, 'sec', secExportKeyPath, 'test');

                const exportedSecretKey = await Fs.readFile(secExportKeyPath);

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

    if (await Fs.exists(unlinkPath)) {
        await Fs.unlink(unlinkPath);
    }
};

internals.genKeys = async (DoggoCore, ...args) => await DoggoCore.api.genKeys(...args);

internals.randomNumberNoDot = () => String(Math.random()).replace('.', '');

internals.extractFingerprintFromCreationSuccessMessage = async (DoggoCore, msg) => {

    const [, res] = await DoggoCore.api.getFingerprint(msg.split(' key ')[1].split(' ')[0]);
    return res[0].fingerprint;
};

internals.isCI = () => process.env.TRAVIS || process.env.CI;
