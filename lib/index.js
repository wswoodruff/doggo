'use strict';

const Api = require('./api');
const Package = require('../package.json');

// Why not write something with Fs to read the filenames and require each file under "./errors"?
// That'd probably be nice, but for this repo especially, it's much more important to be very
// simple and clear, and try to use as few tricks as possible, to minimize the attack surface area.
const InvalidKeyError = require('./errors/InvalidKeyError');
const TooManyKeysError = require('./errors/TooManyKeysError');

const getDoggo = (adapter, options) => ({
    api: Api(adapter, options),
    version: Package.version,
    InvalidKeyError,
    TooManyKeysError
});

// Assign these errors to the exported func for convenience
// of grabbing them right off the Doggo object
// ex: const Doggo = requrie('doggo');
// Doggo.InvalidKeyError === InvalidKeyError;
getDoggo.InvalidKeyError = InvalidKeyError;
getDoggo.TooManyKeysError = TooManyKeysError;

module.exports = getDoggo;
