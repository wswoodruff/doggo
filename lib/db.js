
const db = require('knex')(require('./knexfile').development);
const registeredCmd = {
    val: false
};

const DoggoUtils = require('./utils');

module.exports = (Program, Doggo) => {

    const dbUtils = {};
    dbUtils.db = db;

    dbUtils.onError = (err) => {

        console.log(err);
    };

    dbUtils.onErrorDestroy = (err) => {

        console.log(err);
        db.destroy();
        process.exit(1);
    };

    dbUtils.logAndDestroy = (logItem) => {

        console.log(logItem);
        db.destroy();
    }

    dbUtils.destroy = () => {

        db.destroy();
    }

    dbUtils.getOne = (tableName, criteria) => {

        return new Promise((resolve, reject) => {

            db(tableName)
            .select()
            .where(criteria)
            .then((res) => {

                // There can only be ONE!

                return resolve(res[0]);
            })
            .catch(dbUtils.onErrorDestroy)
        });
    }

    dbUtils.getSettings = () => {

        return dbUtils.getOne('Settings', { id: 1 })
        .catch(dbUtils.onErrorDestroy);
    };

    dbUtils.listTable = (tableName) => {

        return db(tableName)
        .select()
        .then((rows) => {

            if (rows.length === 0) {
                return console.log('No entries in table ' + tableName);
            }

            if (tableName === 'Users') {
                rows = rows.map((user) => {
                    delete user.publicKey;
                    return user;
                })
            }

            console.log(rows);
        })
        .catch(dbUtils.onErrorDestroy);
    };

    dbUtils.assertExists = (tableName, query, errMsg) => {

        return new Promise((resolve, reject) => {

            db(tableName)
            .select()
            .where(query)
            .then((res) => {

                if (res.length > 1) {
                    return dbUtils.onErrorDestroy(`"${JSON.stringify(query, undefined, 4)}"\nreturned more than ONE result\n "${JSON.stringify(res)}"`);
                }
                else if (res.length === 0) {
                    if (!errMsg) {
                        return dbUtils.onErrorDestroy(`"${JSON.stringify(query, undefined, 4)}"\nnot found in "${tableName}"`);
                    }
                    return dbUtils.onErrorDestroy(errMsg);
                }
                return resolve(res[0]);
            })
            .catch(dbUtils.onErrorDestroy);
        })
        .catch(dbUtils.onErrorDestroy);
    };

    dbUtils.getUser = (usernameOrEmail) => {

        return new Promise((resolve, reject) => {

            db('Users')
            .select()
            .where({ name: usernameOrEmail })
            .orWhere({ email: usernameOrEmail })
            .then((user) => {

                DoggoUtils.assertThereCanOnlyBeONE(user);

                if (user.length > 1) {
                    return dbUtils.onErrorDestroy(`"${usernameOrEmail}" returned more than ONE result\n"${JSON.stringify(user)}"`);
                }
                else if (user.length === 0) {
                    return dbUtils.onErrorDestroy(`User "${usernameOrEmail}" not found`);
                }

                // There can only be ONE!

                return resolve(user[0]);
            })
            .catch(dbUtils.onErrorDestroy);
        })
        .catch(dbUtils.onErrorDestroy);
    };

    dbUtils.getUsers = (usernameOrEmail) => {

        return new Promise((resolve, reject) => {

            db('Users')
            .select()
            .where({ name: usernameOrEmail })
            .orWhere({ email: usernameOrEmail })
            .then((users) => {

                return resolve(users);
            })
            .catch(dbUtils.onErrorDestroy);
        })
        .catch(dbUtils.onErrorDestroy);
    };

    dbUtils.checkUserExists = (usernameOrEmail) => {

        return new Promise((resolve, reject) => {

            db('Users')
            .select()
            .where({ name: usernameOrEmail })
            .orWhere({ email: usernameOrEmail })
            .then((user) => {

                if (user.length !== 1) {
                    return false;
                }

                // There can only be ONE!

                return true;
            })
            .catch(dbUtils.onErrorDestroy);
        })
        .catch(dbUtils.onErrorDestroy);
    };

    if (!registeredCmd.val) {

        registeredCmd.val = true;

        Program
        .command('ls <tableName> [params...]')
        .alias('list')
        .description('List things in Doggo')
        .action((tableName, params) => {

            switch (tableName.toLowerCase()) {

                case 'keys':

                    Doggo.api.listKeys()
                    .then(dbUtils.logAndDestroy);
                    break;

                case 'remote':

                    dbUtils.listTable('Remotes')
                    .then(dbUtils.destroy);
                    break;

                case 'user':
                case 'users':

                    dbUtils.listTable('Users')
                    .then(dbUtils.destroy);
                    break;

                case 'link':
                case 'remoteuser':
                case 'usersremotes':

                    dbUtils.listTable('UsersRemotes')
                    .then(dbUtils.destroy);
                    break;

                case 'settings':

                    dbUtils.listTable('Settings')
                    .then(dbUtils.destroy);
                    break;

                case 'groups':

                    dbUtils.listTable('Groups')
                    .then(dbUtils.destroy);
                    break;

                case 'organizations':
                case 'orgs':

                    dbUtils.listTable('Organizations')
                    .then(dbUtils.destroy);
                    break;
            };
        });
    }

    return dbUtils;
}
