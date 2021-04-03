'use strict';

exports.removeEmptyLines = (arr) => [].concat(arr).map((str) => str.replace(/\n\n/g, ''));
