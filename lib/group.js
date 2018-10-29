
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
            ls: 'doggo group ls',
            addCreate: 'doggo group add|create <name> <user> <remote>',
            removeDelete: 'doggo group remove|delete <name> <user> <remote>',
        }

        Program
        .command('group [cmd] [params...]')
        .description('Work with groups')
        .action((cmd, params) => {

            switch (cmd) {

                case 'ls':

                    (() => {
                        dbUtils.listTable('Groups')
                        .then(() => {

                            db.destroy();
                        });
                    })();
                    break;

                case 'add':
                case 'create':

                    (() => {
                        const [ groupName, userName, remoteName ] = utils.assertParams(params, 3, subCommandUsage.addCreate);

                        dbUtils.assertExists('Users', { name: userName })
                        .then((user) => {

                            dbUtils.assertExists('Remotes', { name: remoteName })
                            .then((remote) => {

                                doggoClient.remoteAuthRequest(
                                    remote,
                                    user,
                                    'POST',
                                    '/doggo/groups',
                                    { name: groupName }
                                )
                                .then((res) => {

                                    db('Groups')
                                    .insert({
                                        name: res.name
                                    })
                                    .then(() => {

                                        dbUtils.logAndDestroy(res);
                                    })
                                    .catch(dbUtils.onErrorDestroy);
                                })
                                .catch(dbUtils.onErrorDestroy);
                            })
                            .catch(dbUtils.onErrorDestroy);
                        })
                        .catch(dbUtils.onErrorDestroy);
                    })();
                    break;

                case 'remove':
                case 'delete':

                    (() => {
                        const [ name, user, remote ] = utils.assertParams(params, 3, subCommandUsage.removeDelete);

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
