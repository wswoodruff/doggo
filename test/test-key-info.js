'use strict';

const Path = require('path');

const Dedent = require('../vendor/dedent');
const Utils = require('./utils');

// This lone warrior, 'TestKeyInfo', is the ultimate
// judge for if things between mock-adapter and
// adapter-test-suite are lining up properly.

const CLEAR_TEXT = {
    CAR_KEYS: Dedent`
        Sry I can't remember where I
        buried your car keys I'm just a pup
    `
};

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
                CAR_KEYS: [
                    // Encrypted cleartext should never be the same twice
                    Utils.removeEmptyLines(Dedent`
                        -----BEGIN PGP MESSAGE-----

                        hF4DGneFmNbx5b0SAQdAFSfosqEp1CNlq1CHJCWlKr+2M6ryAFNTMf1rn4dlGWQw
                        cdFgHDY81AYMq0WHhpOJoigj1go3iLSggLtfkOCD8TEZCu330f1Jb7Qgwo1p9Ngd
                        0osBRr0q/Mk1v+b9EIftm/pawdFG3SVm+xzbmZO2uQ+sG+IcVpw2H9g3yWF2peam
                        0dOakM13FgEG0w8CS60j9U5BTx2AY/U62PrA/Y7Y61DpMfPWXyimNd6jRj3qulId
                        iyDHyVu/g+GdBiwhQZjjCjiDp2SptqZtKhFAoRnf0M5XC2MrAe+DdGuu0D2z
                        =iDL0
                        -----END PGP MESSAGE-----
                    `),
                    Utils.removeEmptyLines(Dedent`
                        -----BEGIN PGP MESSAGE-----

                        hF4DGneFmNbx5b0SAQdA8bjG6mUaSbtzmXuIyu4yPEQwiMjq0N7wknNXxkk/gw4w
                        U8hFfG0bEapYVdMgbEwZCwSVB8CKXBUgCjKIZ92q/Sq1WSgxFQa+MAsS5aMB7Cpj
                        0ooB6EJTijvCvCtJQN5pKnb28FmAwv3RCGQByGAXtMOjeeIRN9a0KnNeeOatq3VI
                        IrHtqYkEuZ4nBq3ZtDY69Q7iZ8rRqc2gWBZ3B0PxfGcf0WAfST/+16KqgvJvc6co
                        +V9VsiPnupgyAB/JpQGLxBmOdCe2eHXRVlsUSgYEfxwJJ9ThpdBkYGen9iU=
                        =pc/N
                        -----END PGP MESSAGE-----
                    `)
                ]
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
