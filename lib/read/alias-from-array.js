'use strict';
module.exports = aliasFromArray

var util = require('util')
var errors = require('../errors')

var UNKNOWN_ALIAS = 'unknown alias `%s\''

function aliasFromArray(aliases, ref) {
    if (!aliases.hasOwnProperty(ref.value)) {
        var message = util.format(UNKNOWN_ALIAS, ref.value)
        throw errors.parse(message, ref.location)
    }
    return aliases[ref.value].refs
}
