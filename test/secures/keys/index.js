'use strict';

const Path = require('path');

module.exports = {
    PUB_SEC: {
        fingerprint: '619F717B7CA53E49F760E8FE438194925F8543A9',
        keyPaths: {
            pub: Path.join(__dirname, 'pubSec.pub'),
            sec: Path.join(__dirname, 'pubSec.sec')
        }
    },
    SEC_ONLY: {
        fingerprint: 'C621F4FD6113F55B1AFC0ED13844975650F7B6FC',
        keyPaths: {
            sec: Path.join(__dirname, 'secOnly.sec')
        }
    },
    PUB_ONLY: {
        fingerprint: 'ED13DABE5CFDBCF66C50C42490C974227C71F5E0',
        keyPaths: {
            pub: Path.join(__dirname, 'pubOnly.pub')
        }
    }
};
