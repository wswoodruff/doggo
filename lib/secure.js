
const Items = require('items');
const Prompt = require('prompt');
const CopyPaste = require('copy-paste');
const Hoek = require('hoek');

const registeredCmd = {
    val: false
};

module.exports = (Program, Doggo) => {

    const dbUtils = require('./db')(Program, Doggo);
    const utils = require('./utils')(Program, Doggo);
    const doggoClient = require('./client')(Program, Doggo);
    const db = dbUtils.db;

    if (!registeredCmd.val) {

        registeredCmd.val = true;

        const subCommandUsage = {
            ls: 'doggo secure ls <user> <remote>',
            addCreate: 'doggo secure add|create <password|file|text|json> <user> <remote> <group|organization> <groupName|organizationName>'
        }

        Program
        .command('secure [cmd] [params...]')
        .description('Work with secures')
        .action((cmd, params) => {

            switch (cmd) {

                case 'ls':
                    (() => {

                        const [ userName, remoteName ] = utils.assertParams(params, 2, subCommandUsage.ls);

                        dbUtils.assertExists('Users', { name: userName })
                        .then((user) => {

                            dbUtils.assertExists('Remotes', { name: remoteName })
                            .then((remote) => {

                                doggoClient.remoteAuthRequest(remote, user, 'GET', `/doggo/users/secure/all`)
                                .then((payload) => {

                                    Prompt.start();
                                    Prompt.get({
                                        properties: {
                                            secretKeyPassword: {
                                                description: 'Enter secret key password',
                                                hidden: true
                                            }
                                        }
                                    },
                                    (err, promptRes) => {

                                        const decryptPassword = promptRes.secretKeyPassword

                                        const decryptedSecures = [];
                                        Items.parallel(payload, (item, next) => {

                                            Doggo.api.decryptText(decryptPassword, item.secureItem)
                                            .then((decryptedSecure) => {

                                                item.secureItem = JSON.parse(decryptedSecure);
                                                decryptedSecures.push(item);
                                                next();
                                            })
                                            .catch(next);
                                        },
                                        (err) => {

                                            if (err) {
                                                return dbUtils.onErrorDestroy(err);
                                            }

                                            dbUtils.logAndDestroy(decryptedSecures);

                                            if (decryptedSecures.length === 1) {
                                                if (decryptedSecures[0].secureItem.password) {
                                                    CopyPaste.copy(decryptedSecures[0].secureItem.password);
                                                    console.log('');
                                                    console.log('Password copied to clipboard');
                                                    console.log('');
                                                }
                                            }
                                        });
                                    });
                                })
                                .catch(dbUtils.onErrorDestroy);
                            })
                            .catch(dbUtils.onErrorDestroy);
                        })
                        .catch(dbUtils.onErrorDestroy);
                    })();

                    break;

                case 'add':
                case 'create':

                    (() => {
                        const [ secureType, userName, remoteName ] = utils.assertParams(params, 3, subCommandUsage.addCreate);

                        Hoek.assert(
                            secureType === 'password' ||
                            secureType === 'file' ||
                            secureType === 'text' ||
                            secureType === 'json'
                        );

                        let targetType;
                        let targetName;
                        let targetAssertPromise;

                        if (params[3]) {
                            targetType = params[3];
                            targetName = params[4];

                            Hoek.assert(targetType === 'user' || targetType === 'group' || targetType === 'organization');

                            targetAssertPromise = new Promise((resolve, reject) => {

                                switch (targetType) {

                                    case 'group':
                                        targetAssertPromise = dbUtils.assertExists('Groups', { name: targetName })
                                        .catch(dbUtils.onErrorDestroy);
                                        break;
                                    case 'organization':
                                        targetAssertPromise = dbUtils.assertExists('Organizations', {
                                            name: targetName
                                        })
                                        .catch(dbUtils.onErrorDestroy);
                                }
                            });
                        }
                        else {

                            // Default to local db
                            targetAssertPromise = Promise.resolve();
                        }

                        const asyncActions = [];
                        let secureItem = {};

                        targetAssertPromise.then(async () => {

                            const user = await dbUtils.assertExists('Users', { name: userName })

                            dbUtils.assertExists('Remotes', { name: remoteName })
                            .then((remote) => {

                                switch (secureType) {

                                    case 'password':

                                        asyncActions.push((next) => {

                                            Prompt.start();
                                            Prompt.get({
                                                properties: {
                                                    generatePassword: {
                                                        description: 'Generate password? [yes/no]'
                                                    }
                                                }
                                            },
                                            (err, firstPromptRes) => {

                                                if (err) {
                                                    return dbUtils.onErrorDestroy(err);
                                                }

                                                firstPromptRes.generatePassword = firstPromptRes.generatePassword.toLowerCase();

                                                let promptProps = {
                                                    username: {
                                                        description: 'Enter username associated with this password'
                                                    }
                                                };

                                                if (firstPromptRes.generatePassword !== 'yes' &&
                                                firstPromptRes.generatePassword !== 'y') {

                                                    promptProps = Object.assign(promptProps, {
                                                        password: {
                                                            hidden: true,
                                                            description: 'Enter password'
                                                        },
                                                        confirmPassword: {
                                                            hidden: true,
                                                            description: 'Confirm password'
                                                        }
                                                    });
                                                }

                                                promptProps = Object.assign(promptProps, {
                                                    key: {
                                                        description: 'Enter a key to reference this item by'
                                                    },
                                                    url: {
                                                        description: 'Enter URL (optional)'
                                                    },
                                                    description: {
                                                        description: 'Enter description. This will be searchable when finding it later (optional)'
                                                    },
                                                    extras: {
                                                        description: 'Enter any extra info here like security questions if you\'d like (optional)'
                                                    }
                                                });

                                                Prompt.start();
                                                Prompt.get({
                                                    properties: promptProps
                                                },
                                                (err, promptRes) => {

                                                    if (err) {
                                                        return dbUtils.onErrorDestroy(err);
                                                    }

                                                    if (firstPromptRes.password !== firstPromptRes.confirmPassword) {
                                                        return dbUtils.onErrorDestroy('Passwords don\'t match. Try again');
                                                    }

                                                    delete promptRes.confirmPassword;

                                                    if (firstPromptRes.generatePassword === 'yes' ||
                                                    firstPromptRes.generatePassword === 'y') {
                                                        secureItem = promptRes;
                                                        secureItem.password = Doggo.api.genPassword();
                                                    }
                                                    else {
                                                        secureItem = promptRes;
                                                    }

                                                    next();
                                                });
                                            });
                                        });
                                        break;

                                    case 'file':

                                        return dbUtils.logAndDestroy('Files not supported yet');
                                        asyncActions.push((next) => {

                                            Prompt.start();
                                            Prompt.get({
                                                properties: {
                                                    filePath: {
                                                        description: 'Enter filepath'
                                                    },
                                                    key: {
                                                        description: 'Enter a key to reference this item by'
                                                    },
                                                    description: {
                                                        description: 'Enter description. This will be searchable when finding it later (optional)'
                                                    },
                                                    extras: {
                                                        description: 'Enter any extra info here like security questions if you\'d like (optional)'
                                                    }
                                                }
                                            },
                                            (err, promptRes) => {

                                                if (err) {
                                                    return dbUtils.onErrorDestroy(err);
                                                }

                                                secureItem = promptRes;

                                                next();
                                            });
                                        });
                                        break;

                                    case 'text':

                                        asyncActions.push((next) => {

                                            Prompt.get({
                                                properties: {
                                                    text: {
                                                        description: 'Enter secure text'
                                                    },
                                                    key: {
                                                        description: 'Enter a key to reference this item by'
                                                    },
                                                    description: {
                                                        description: 'Enter description. This will be searchable when finding it later (optional)'
                                                    },
                                                    extras: {
                                                        description: 'Enter any extra info here like security questions if you\'d like (optional)'
                                                    }
                                                }
                                            },
                                            (err, promptRes) => {

                                                if (err) {
                                                    return dbUtils.onErrorDestroy(err);
                                                }

                                                secureItem = promptRes;

                                                next();
                                            });
                                        });
                                        break;

                                    case 'json':

                                        asyncActions.push((next) => {

                                            Prompt.get({
                                                properties: {
                                                    json: {
                                                        description: 'Enter secure json'
                                                    },
                                                    key: {
                                                        description: 'Enter a key to reference this item by'
                                                    },
                                                    description: {
                                                        description: 'Enter description. This will be searchable when finding it later (optional)'
                                                    },
                                                    extras: {
                                                        description: 'Enter any extra info here like security questions if you\'d like (optional)'
                                                    }
                                                }
                                            },
                                            (err, promptRes) => {

                                                if (err) {
                                                    return dbUtils.onErrorDestroy(err);
                                                }

                                                secureItem = promptRes;

                                                next();
                                            });
                                        });
                                        break;
                                };

                                Items.serial(asyncActions, (item, next) => {

                                    item(next);
                                },
                                (err) => {

                                    if (err) {
                                        return dbUtils.onErrorDestroy(err);
                                    }

                                    // SecureItem props are populated above
                                    // These items should be readable on the db, unencrypted for searching purposes
                                    const secureSearchable = {
                                        key: secureItem.key,
                                        description: secureItem.description
                                    };

                                    delete secureItem.key;
                                    delete secureItem.description;

                                    Doggo.api.encryptTextFor(user.fingerprint, JSON.stringify(secureItem))
                                    .then((encryptedSecureItem) => {

                                        const targetObj = {};
                                        switch (targetType) {

                                            case 'group':
                                                targetObj.group = targetName;
                                                break;
                                            case 'organization':
                                                targetObj.organization = targetName;
                                                break;
                                        }

                                        const requestPayload = Object.assign({
                                            secureItem: encryptedSecureItem,
                                            type: secureType
                                        }, targetObj, secureSearchable);

                                        doggoClient.remoteAuthRequest(
                                            remote,
                                            user,
                                            'POST',
                                            '/doggo/secureItems',
                                            requestPayload
                                        )
                                        .then((res) => {

                                            dbUtils.logAndDestroy(res);
                                        })
                                        .catch(dbUtils.onErrorDestroy);
                                    })
                                    .catch(dbUtils.onErrorDestroy);
                                })
                            })
                            .catch(dbUtils.onErrorDestroy);
                        })
                        .catch(dbUtils.onErrorDestroy);
                    })();
                    break;

                default:
                    console.log('--help');
                    const subCommandKeys = Object.keys(subCommandUsage);
                    console.log(subCommandKeys.reduce((collector, key, i) => {

                        collector += `    ${subCommandUsage[key]}`;

                        if (i < subCommandKeys.length - 1) {
                            collector += '\n';
                        }

                        return collector;
                    }, ''));
                    break;
            }
        });
    }
}
