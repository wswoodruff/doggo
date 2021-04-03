'use strict';

const Path = require('path');

const Dedent = require('../vendor/dedent');
const Utils = require('./utils');

// This lone warrior, 'TestKeyInfo', is the ultimate
// judge for if things between mock-adapter and
// adapter-test-suite are lining up properly.

const CLEAR_TEXT = {
    carKeys: Dedent`
        Sry I can't remember where I
        buried ur car keys I'm just a pup
    `
};

const first = (arr) => arr[0];

module.exports = {
    CLEAR_TEXT,
    KEYS: {
        PUB_SEC: {
            fingerprint: '8EE6530544AD9745D5A32C485E27573F6126A601',
            identifier: 'doggo test pubSec 09723339678055607',
            password: 'test',
            keyPaths: {
                pub: Path.join(__dirname, 'secures/keys/pubSec.pub'),
                sec: Path.join(__dirname, 'secures/keys/pubSec.sec')
            },
            encryptedText: {
                carKeys: {
                    clearText: CLEAR_TEXT.carKeys,
                    encrypted: [
                        // Encrypted text should never be the same twice
                        first(Utils.removeEmptyLines(Dedent`
                            -----BEGIN PGP MESSAGE-----

                            hF4DLttmovOslKMSAQdAspC/iO1DoW4h8dUohQt2v1XVpEwL4wZ/F6uLjJW0d3Uw
                            sRGpNA67mbvzuuSoTiBbgshjHJ23dOT1Tm4kfIjtCSfOJ/YiHuJulYKo5fiIMBfr
                            0oUBmPv0KoWeS6tWpWAMOVdua+RbR3vCYr4iB9R+Tf84mxEMJwg1G0B1NIPxD1ic
                            lRwJDX9c6gNP+17DpF4zTnfVjNYfAPvZueLmR2zvjArRP4BnBGd+EMSLq83z2Dlf
                            IBdb8kA8B6Av6Kr2ZLYdXfaHHK8F93PVVBgdjO0xt7MwFiFeXtb5
                            =TDof
                            -----END PGP MESSAGE-----
                        `)),
                        first(Utils.removeEmptyLines(Dedent`
                            -----BEGIN PGP MESSAGE-----

                            hF4DLttmovOslKMSAQdA3a16fsVbowp0ss0pHOhzCtpZIlNRuCCNcAK9BSG2QEAw
                            ry0XfMhdwX5rYp9mAFdguTH+dhFQxTtuAtw+RkAOYrGSU6evWOjXttdf8n17F3TD
                            0oQB33i2DPVB97eESW3so8VX8DYYBlLjIpiwZURtLwJt5lZUeRSCBT4pmxrwvJm7
                            j6k4cjJO2jRJrQpCI418hlw/g/0ACGnQ0L2fa0n3hFY1DMU4R2Wyof9m1eji3Ih3
                            nWKx6DnqGtHlJedIrVpuPdtI7pAmGtUHUpSGkSCjSao4S/8DeTY=
                            =hl+B
                            -----END PGP MESSAGE-----
                        `))
                    ]
                }
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
