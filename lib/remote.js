
const Prompt = require('prompt');

const registeredCmd = {
    val: false
};

module.exports = (Program, Doggo) => {

    const utils = require('./utils')(Program, Doggo);
    const dbUtils = require('./db')(Program, Doggo);
    const doggoClient = require('./client')(Program, Doggo);
    const db = dbUtils.db;

    if (!registeredCmd.val) {

        registeredCmd.val = true;

        const subCommandUsage = {
            ls: 'doggo remote ls',
            addCreate: 'doggo remote add|create <name> <url>',
            getUrl: 'doggo remote get-url <name>',
            setUrl: 'doggo remote set-url <name> <url>',
            unlink: 'doggo remote unlink <remoteName> <username>',
            linkUser: 'doggo remote link|link-user  <remoteName> <username|email>',
            login: 'doggo remote login <remoteName> <username|email>',
            rename: 'doggo remote rename <old> <new>',
            removeDelete: 'doggo remote remove|delete <name>',
        }

        Program
        .command('remote [cmd] [params...]')
        .description('Work with remotes')
        .action((cmd, params) => {

            switch (cmd) {

                case 'ls':

                    (() => {
                        dbUtils.listTable('Remotes')
                        .then(() => {

                            db.destroy();
                        });
                    })();
                    break;

                case 'add':
                case 'create':

                    (() => {
                        const [name, url] = utils.assertParams(params, 2, subCommandUsage.addCreate);

                        db('Remotes')
                        .insert({
                            name: name,
                            url: url
                        })
                        .then(() => {

                            db('Remotes')
                            .select()
                            .then((allRemotes) => {

                                return dbUtils.logAndDestroy('Success!');
                            })
                            .catch(dbUtils.onErrorDestroy);
                        })
                        .catch(dbUtils.onErrorDestroy);
                    })();
                    break;

                case 'get-url':

                    (() => {
                        const [ name ] = utils.assertParams(params, 1, subCommandUsage.getUrl);

                        dbUtils.assertExists('Remotes', { name: name })
                        .then((remote) => {

                            dbUtils.logAndDestroy(remote.url);
                        })
                        .catch(dbUtils.onErrorDestroy);
                    })();
                    break;

                case 'set-url':

                    (() => {
                        const [ name, url ] = utils.assertParams(params, 2, subCommandUsage.setUrl);

                        dbUtils.assertExists('Remotes', { name: name })
                        .then((remote) => {

                            db('Remotes')
                            .update({ url: url })
                            .where({ name: remote.name })
                            .then(() => {

                                dbUtils.getOne('Remotes', { name: remote.name })
                                .then((updatedRemote) => {

                                    dbUtils.logAndDestroy(updatedRemote);
                                })
                            })
                            .catch(dbUtils.onErrorDestroy);
                        })
                        .catch(dbUtils.onErrorDestroy);
                    })();
                    break;

                case 'link':
                case 'link-user':

                    (() => {
                        const [ remoteName, userName ] = utils.assertParams(params, 2, subCommandUsage.linkUser);

                        dbUtils.assertExists('Users', { name: userName })
                        .then((foundUser) => {

                            dbUtils.assertExists('Remotes', { name: remoteName })
                            .then((foundRemote) => {

                                Prompt.start();
                                console.log('\nSetting up remote login\n');
                                Prompt.get({
                                    properties: {
                                        remotePassword: {
                                            hidden: true,
                                            description: 'Enter remote password'
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

                                    if (promptRes.remotePassword !== promptRes.confirmPassword) {
                                        return dbUtils.logAndDestroy('Passwords don\'t match. Try again');
                                    }

                                    doggoClient.addUser(foundRemote, foundUser, promptRes.remotePassword)
                                    .then((res) => {

                                        dbUtils.logAndDestroy(res);
                                    })
                                    .catch(dbUtils.onErrorDestroy);
                                });
                            })
                            .catch(dbUtils.onErrorDestroy);
                        })
                        .catch(dbUtils.onErrorDestroy);

                    })();
                    break;

                case 'unlink':

                    (() => {
                        const [ remoteName, userName ] = utils.assertParams(params, 2, subCommandUsage.unlink);

                        db('UsersRemotes')
                        .where({ remoteName: remoteName })
                        .andWhere({ userName: userName })
                        .delete()
                        .then(() => {

                            db('Users')
                            .update({ jwt: null })
                            .where({ name: userName })
                            .then (() => {

                                dbUtils.logAndDestroy(`Deleted link with user "${userName}" and "${remoteName}"`);
                            });
                        });
                    })();
                    break;

                case 'login':

                    (() => {
                        const [ remoteName, userName ] = utils.assertParams(params, 2, subCommandUsage.login);

                        dbUtils.assertExists('Users', { name: userName })
                        .then((foundUser) => {

                            dbUtils.assertExists('Remotes', { name: remoteName })
                            .then((foundRemote) => {

                                doggoClient.loginUserToRemote(foundRemote, foundUser)
                                .then((res) => {

                                    dbUtils.logAndDestroy(`Success! User "${foundUser.name}" logged into remote "${foundRemote.name}"`);
                                });
                            })
                            .catch(dbUtils.onErrorDestroy);

                        })
                        .catch(dbUtils.onErrorDestroy);
                    })();
                    break;

                case 'rename':

                    (() => {
                        const [ oldName, newName ] = utils.assertParams(params, 2, subCommandUsage.rename);

                        dbUtils.assertExists('Remotes', { name: oldName })
                        .then((remote) => {

                            db('Remotes')
                            .update({ name: newName })
                            .where({ name: oldName })
                            .then((something) => {

                                return dbUtils.logAndDestroy(`Changed remote "${oldName}" to "${newName}"`);
                            })
                            .catch(dbUtils.onErrorDestroy);
                        })
                        .catch(dbUtils.onErrorDestroy);
                    })();
                    break;

                case 'remove':
                case 'delete':

                    (() => {
                        const [ remoteName ] = utils.assertParams(params, 1, subCommandUsage.removeDelete);

                        dbUtils.assertExists('Remotes', { name: remoteName })
                        .then((remote) => {

                            db('Remotes')
                            .where({ name: remote.name })
                            .delete()
                            .then(() => {

                                db('UsersRemotes')
                                .where({ remoteName: remote.name })
                                .delete()
                                .then(() => {

                                    return dbUtils.logAndDestroy(`Deleted remote ${remote.name}`);
                                })
                                .catch(dbUtils.onErrorDestroy);
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
            };
        });
    }
};
