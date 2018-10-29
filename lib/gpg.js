
const Prompt = require('prompt');

const registeredCmd = {
    val: false
};

module.exports = (Program, Doggo) => {

    if (!registeredCmd.val) {

        registeredCmd.val = true;

        Program
        .command('getFingerprint [keyIdentifier...]')
        .description('Get fingerprint for user identified by "key identifier"')
        .action((keyIdentifier) => {

            // In case the key identifier contains spaces

            if (Array.isArray(keyIdentifier)) {
                keyIdentifier = keyIdentifier.join(' ');
            }

            console.log('Getting fingerprint for "' + keyIdentifier + '"');

            Doggo.api.getFingerprint(keyIdentifier)
            .then(console.log)
            .catch(console.log);
        });

        Program
        .command('genKeys')
        .description('Generate keys for a new user')
        .action(() => {

            Doggo.api.genKeys()
            .then(console.log)
            .catch(console.log);
        });

        Program
        .command('deleteKey <fingerprint> <keyType>')
        .description('Delete a key for user <fingerprint>')
        .action((fingerprint, keyType) => {

            Doggo.api.deleteKey(fingerprint, keyType)
            .then(console.log)
            .catch(console.log);
        });

        Program
        .command('deleteAllKeys <fingerprint>')
        .description('Delete all keys for user <fingerprint>')
        .action((fingerprint) => {

            Doggo.api.deleteAllKeys(fingerprint)
            .then(console.log)
            .catch(console.log);
        });

        Program
        .command('importKey <keyPath>')
        .description('Import a key')
        .action((keyPath) => {

            Doggo.api.importKey(keyPath)
            .then(console.log)
            .catch(console.log);
        });

        Program
        .command('exportKey <fingerprint> <keyType> <keySavePath>')
        .description('Export a "secret" or "public" key for user <fingerprint> to a file')
        .action((fingerprint, keyType, keySavePath) => {

            Doggo.api.exportKey(fingerprint, keyType, keySavePath)
            .then(console.log)
            .catch(console.log);
        });

        Program
        .command('getKey <fingerprint> <keyType>')
        .description('Get a "secret" or "public" key for user <fingerprint>')
        .action((fingerprint, keyType) => {

            Doggo.api.getKey(fingerprint, keyType)
            .then(console.log)
            .catch(console.log);
        });

        Program
        .command('listKeys [keyIdentifier]')
        .description('Check if key exists or list keys for given key identifier')
        .action((keyIdentifier) => {

            Doggo.api.listKeys(keyIdentifier)
            .then(console.log)
            .catch(console.log);
        });

        Program
        .command('encrypt <fingerprint> [src] [destFile]')
        .option('--symmetric')
        .description('Encrypt a file for user <fingerprint>')
        .action((fingerprint, src, destFile, options) => {

            // If no destFile is provided, the contents will be logged to the console

            Doggo.api.encryptFor(fingerprint, src, destFile, options.symmetric)
            .then(console.log)
            .catch(console.log);
        });

        Program
        .command('decryptFile <filePath>')
        .description('Decrypt a file with a password')
        .action((filePath) => {

            Prompt.start();
            Prompt.get({
                properties: {
                    decryptPassword: {
                        hidden: true,
                        description: 'Decrypt password'
                    }
                }
            }, (err, promptRes) => {

                if (err) {
                    return console.log(err);
                }

                Doggo.api.decryptFile(promptRes.decryptPassword, `${process.cwd()}/${filePath}`)
                .then(console.log)
                .catch(console.log);
            });
        });

        Program
        .command('getDecryptedFileContents <filePath>')
        .description('Decrypt a file with a password')
        .action((filePath) => {

            Doggo.api.getDecryptedFileContents(`${process.cwd()}/${filePath}`)
            .then(console.log)
            .catch(console.log);
        });
    };
}
