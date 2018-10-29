
const Prompt = require('prompt');

const registeredCmd = {
    val: false
};

const internals = {};

module.exports = (Program, Doggo) => {

    const utils = require('./utils')(Program, Doggo);
    const dbUtils = require('./db')(Program, Doggo);
    const doggoClient = require('./client')(Program, Doggo);
    const db = dbUtils.db;

    if (!registeredCmd.val) {

        registeredCmd.val = true;

        const subCommandUsage = {
            ls: 'doggo user ls',
            addCreate: 'doggo user add|create',
            removeDelete: 'doggo user rm|remove|delete <username|email>',
            migrateUp: 'doggo user migrate up <username|email> <remoteName>',
            migrateDown: 'doggo user migrate down <remoteName> <migrateId>',
            clearJwt: 'doggo user clearJwt <username|email>'
        }

        Program
        .command('user [cmd] [params...]')
        .description('Work with users')
        .action((cmd, params) => {

            switch (cmd) {

                case 'ls':

                    (() => {
                        dbUtils.listTable('Users')
                        .then(() => {

                            db.destroy();
                        });
                    })();
                    break;

                case 'add':
                case 'create':

                    (() => {

                        Doggo.api.genKeys()
                        .then((resultsFromGenKeys) => {

                            // TODO this is unfinished, need to add a user
                            // with native gpg answers

                            console.log('//////////');
                            console.log('//////////');
                            console.log('resultsFromGenKeys', resultsFromGenKeys);
                            console.log('//////////');
                            console.log('//////////');
                            // internals.addUser(promptRes.username, promptRes.email, promptRes.password);
                        })
                        .catch(dbUtils.onErrorDestroy);
                    })();
                    break;

                case 'rm':
                case 'remove':
                case 'delete':

                    (() => {
                        const [ usernameOrEmail ] = utils.assertParams(params, 1, subCommandUsage.removeDelete);

                        dbUtils.getUser(usernameOrEmail)
                        .then((user) => {

                            Prompt.start();
                            Prompt.get({
                                properties: {
                                    areYouSure: {
                                        description: `\nAre you absolutely sure you want to delete user ${user.name}?\nYou won't be able to decrypt any secure items associated with this user [yes/no]`
                                    }
                                }
                            }, (err, promptRes) => {

                                if (err) {
                                    return console.log(err);
                                }

                                promptRes.areYouSure = promptRes.areYouSure.toLowerCase();

                                if (promptRes.areYouSure === 'yes' ||
                                    promptRes.areYouSure === 'y') {

                                    db('Users')
                                    .where({ name: user.name })
                                    .delete()
                                    .then(() => {

                                        db('UsersRemotes')
                                        .where({ userName: user.name })
                                        .delete()
                                        .then(() => {

                                            Doggo.api.getFingerprintFor(`${user.name}`)
                                            .then((res) => {

                                                Doggo.api.removeAllKeysFor(res.fingerprint)
                                                .then(() => {

                                                    return dbUtils.logAndDestroy(`Deleted user ${user.name}`);
                                                })
                                                .catch(dbUtils.onErrorDestroy);
                                            })
                                            .catch(dbUtils.onErrorDestroy);
                                        })
                                        .catch(dbUtils.onErrorDestroy);
                                    })
                                    .catch(dbUtils.onErrorDestroy);
                                }
                            });
                        });
                    })();
                    break;

                case 'migrate':

                    (() => {

                        const cmd = params.shift();

                        if (cmd !== 'down' && cmd !== 'up') {
                            console.log(subCommandUsage.migrateUp);
                            return dbUtils.logAndDestroy(subCommandUsage.migrateDown);
                        }

                        if (cmd === 'up') {

                            const [ usernameOrEmail, remoteName ] = utils.assertParams(params, 2, subCommandUsage.migrateUp);

                            dbUtils.getUser(usernameOrEmail)
                            .then((foundUser) => {

                                dbUtils.assertExists('Remotes', { name: remoteName })
                                .then((foundRemote) => {

                                    Doggo.api.getKey(foundUser.fingerprint, 'secret')
                                    .then((sKey) => {

                                        doggoClient.remoteAuthRequest(
                                            foundRemote,
                                            foundUser,
                                            'POST',
                                            '/doggo/users/migrate/up',
                                            {
                                                sKey: sKey,
                                                username: foundUser.name,
                                                email: foundUser.email
                                            }
                                        )
                                        .then((res) => {

                                            console.log('');
                                            console.log('Migrate key:')
                                            console.log(res);
                                            dbUtils.logAndDestroy('');
                                        })
                                        .catch(dbUtils.onErrorDestroy);
                                    })
                                    .catch(dbUtils.onErrorDestroy);
                                })
                                .catch(dbUtils.onErrorDestroy);
                            })
                            .catch(dbUtils.onErrorDestroy);
                        }
                        else if (cmd === 'down') {

                            const [ remoteName, migrateId ] = utils.assertParams(params, 2, subCommandUsage.migrateDown);

                            dbUtils.assertExists('Remotes', { name: remoteName })
                            .then((foundRemote) => {

                                doggoClient.remoteRequest(
                                    foundRemote,
                                    'GET',
                                    `/doggo/users/migrate/down/${migrateId}`
                                )
                                .then((res) => {

                                    res.secureItem = JSON.parse(res.secureItem);
                                    Doggo.api.importKey(res.secureItem.sKey)
                                    .then((importRes) => {

                                        Prompt.start();
                                        Prompt.get({
                                            properties: {
                                                password: {
                                                    hidden: true,
                                                    description: 'Enter secret key password'
                                                },
                                                confirmPassword: {
                                                    hidden: true,
                                                    description: 'Confirm password'
                                                }
                                            }
                                        }, (err, promptRes) => {

                                            if (err) {
                                                return dbUtils.onErrorDestroy(err);
                                            }

                                            if (promptRes.password !== promptRes.confirmPassword) {
                                                return dbUtils.logAndDestroy('Passwords don\'t match. Try again');
                                            }

                                            return internals.addUser(res.secureItem.username, res.secureItem.email, promptRes.password);
                                        });
                                    })
                                })
                                .catch(dbUtils.onErrorDestroy);
                            })
                            .catch(dbUtils.onErrorDestroy);
                        }
                    })();
                    break;

                case 'clearJwt':
                    (() => {
                        const [ usernameOrEmail ] = utils.assertParams(params, 1, subCommandUsage.clearJwt);

                        db('Users')
                        .update({ jwt: null })
                        .where({ name: usernameOrEmail })
                        .orWhere({ email: usernameOrEmail })
                        .then (() => {

                            return dbUtils.logAndDestroy('Success! Cleared jwt');
                        })
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
            };
        });
    }

    internals.addUser = (username, email, password) => {

        Doggo.api.getFingerprintFor(`${username}`)
        .then((res) => {

            Doggo.api.getKey(res.fingerprint, 'public')
            .then((publicKey) => {

                db('Users')
                .insert({
                    email: email,
                    name: username,
                    fingerprint: res.fingerprint,
                    publicKey: publicKey
                })
                .then((user) => {

                    console.log('');
                    console.log(`Success! Inserted user ${username}`);

                    db('Users')
                    .select()
                    .then((allUsers) => {

                        return dbUtils.logAndDestroy('Success');
                    })
                    .catch(dbUtils.onErrorDestroy);
                })
                .catch(dbUtils.onErrorDestroy);
            })
            .catch(dbUtils.onErrorDestroy);
        })
        .catch((err) => {

            console.log('Error during user creation, cannot continue');
            dbUtils.onErrorDestroy(err);
        });
    }
}
