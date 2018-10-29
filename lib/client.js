
const Wreck = require('wreck');
const Prompt = require('prompt');

module.exports = (Program, Doggo) => {

    const dbUtils = require('./db')(Program, Doggo);
    const db = dbUtils.db;

    const doggoClient = {};

    doggoClient.remoteRequest = (remote, method, route, requestOptions) => {

        return new Promise((resolve, reject) => {

            if (route.indexOf('/doggo') === -1) {

                return dbUtils.onErrorDestroy('Doggo routes need to be prefixed with "/doggo"');
            }

            Wreck.request(
                method,
                `${remote.url}${route}`,
                requestOptions,
                (err, res) => {

                if (err) {
                    return reject(err);
                }

                Wreck.read(res, {}, (err, parsedPayload) => {

                    if (Buffer.isBuffer(parsedPayload)) {
                        parsedPayload = parsedPayload.toString('utf8');
                    }

                    try {
                        parsedPayload = JSON.parse(parsedPayload);
                    }
                    catch (ignore) {}

                    return resolve(parsedPayload);
                });
            });
        })
        .catch(dbUtils.onErrorDestroy);
    };

    doggoClient.remoteAuthRequest = (remote, user, method, route, requestPayload) => {

        return new Promise((resolve, reject) => {

            let rslv;
            let rjct;
            let loginPromise = new Promise((res, rej) => {

                rslv = res;
                rjct = rej;
            });

            if (!user.jwt) {

                console.log('');
                console.log('** You need to login to the remote **');
                console.log('');

                doggoClient.createUser(remote, user)
                .then((jwt) => {

                    rslv(jwt);
                })
                .catch((err) => {

                    dbUtils.onErrorDestroy(err);
                    // if (err === 'User or Password is invalid') {
                    //     console.log('oogabooga!');
                    // }
                });
            }
            else {
                rslv(user.jwt);
            }

            loginPromise.then((jwt) => {

                const requestOptions = {
                    headers: {
                        authorization: jwt
                    },
                    payload: requestPayload
                };

                doggoClient.remoteRequest(remote, method, route, requestOptions)
                .then((res) => {

                    return resolve(res);
                })
                .catch(reject);
            })
            .catch(reject);
        });
    };

    doggoClient.loginUserToRemote = (loginRemote, loginUser, loginPassword) => {

        return new Promise((resolve, reject) => {

            let passwordPromise;

            if (!loginPassword) {
                passwordPromise = new Promise((rslv, rjct) => {

                    Prompt.start();
                    Prompt.get({
                        properties: {
                            remotePassword: {
                                hidden: true,
                                description: 'Remote password'
                            }
                        }
                    }, (err, promptRes) => {

                        if (err) {

                            return dbUtils.onErrorDestroy(err);
                        }

                        return rslv(promptRes.remotePassword);
                    });
                })
                .catch(reject);
            }
            else {
                passwordPromise = Promise.resolve(loginPassword);
            }

            passwordPromise.then((password) =>{

                doggoClient.remoteRequest(loginRemote, 'POST', '/doggo/login', {
                    payload: {
                        email: loginUser.email,
                        password: password
                    }
                })
                .then((payload) => {

                    if (payload.message && payload.message === 'User or Password is invalid') {

                        // TODO, this isn't rejecting to the top promise
                        return reject(payload.message);
                    }

                    db('UsersRemotes')
                    .insert({
                        remoteName: loginRemote.name,
                        userName: loginUser.name
                    })
                    .then(() => {

                        db('Users')
                        .update({ jwt: payload })
                        .where({ name: loginUser.name })
                        .then(() => {

                            console.log(`User "${loginUser.name}" logged into remote "${loginRemote.name}"`);
                            return resolve(payload);
                        });
                    });
                })
                .catch(reject);
            })
        })
        .catch(dbUtils.onErrorDestroy);
    };

    doggoClient.createUser = doggoClient.addUser = (remote, user, pword) => {

        let rslv;
        let rjct;

        const getPasswordPromise = new Promise((resolve, reject) => {

            rslv = resolve;
            rjct = reject;
        });

        if (!pword) {
            Prompt.start();
            Prompt.get({
                properties: {
                    remotePassword: {
                        hidden: true,
                        description: 'Remote password'
                    },
                    confirmPassword: {
                        hidden: true,
                        description: 'Confirm password'
                    }
                }
            }, (err, promptRes) => {

                if (err) {
                    return rjct(err);
                }

                if (promptRes.remotePassword !== promptRes.confirmPassword) {
                    return dbUtils.onErrorDestroy('Passwords don\'t match, try again.');
                }
                pword = promptRes.remotePassword;
                rslv(pword);
            });
        }
        else {
            rslv(pword);
        }

        return new Promise((resolve, reject) => {

            getPasswordPromise.then((password) => {

                doggoClient.remoteRequest(remote, 'POST', '/doggo/users', {
                    payload: {
                        email: user.email,
                        password: password,
                        name: user.name,
                        publicKey: user.publicKey
                    }
                })
                .then((payload) => {

                    if (payload.message && payload.message.indexOf('Unique email error:') > -1) {
                        console.log(`User "${user.name}" already exists on remote. Trying login.`);
                    }

                    doggoClient.loginUserToRemote(remote, user, password)
                    .then((jwt) => {

                        if (payload.error) {
                            return reject(payload.message);
                        }

                        console.log(`Success! User ${user.name} linked with remote ${remote.name}`);
                        return resolve(jwt);
                    });
                })
                .catch((err) => {

                    console.log(err);
                })
            })
            .catch(reject);
        });
    };

    return doggoClient;
};
