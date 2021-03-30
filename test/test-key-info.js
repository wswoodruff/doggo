'use strict';

const Path = require('path');

// This lone warrior, 'TestKeyInfo', is the ultimate
// judge for if things between mock-adapter and
// adapter-test-suite are lining up properly.

module.exports = {
    KEYS: {
        PUB_SEC: {
            fingerprint: '8EE6530544AD9745D5A32C485E27573F6126A601',
            identifier: 'doggo test pubSec 09723339678055607',
            password: 'test',
            keyPaths: {
                pub: Path.join(__dirname, 'secures/keys/pubSec.pub'),
                sec: Path.join(__dirname, 'secures/keys/pubSec.sec')
            }
        },
        SEC_ONLY: {
            fingerprint: 'C621F4FD6113F55B1AFC0ED13844975650F7B6FC',
            identifier: 'doggo test sec only 07654950429608411',
            password: 'test',
            keyPaths: {
                pub: null,
                sec: Path.join(__dirname, 'secures/keys/secOnly.sec')
            }
        },
        PUB_ONLY: {
            fingerprint: 'ED13DABE5CFDBCF66C50C42490C974227C71F5E0',
            identifier: 'doggo test pub only 064285959780167',
            keyPaths: {
                pub: Path.join(__dirname, 'secures/keys/pubOnly.pub'),
                sec: null
            }
        }
    }
};
