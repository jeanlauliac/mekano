'use strict';
module.exports = {
    invalidArg: invalidArg
  , parse: parse
}

var util = require('util')

var INVALID_ARG = 'invalid argument `%s\' with value: %s'

function invalidArg(name, value) {
    var err = new Error(util.format(INVALID_ARG, name, value))
    err.name = 'InvalidArgError'
    err.propertyName = name
    err.propertyValue = value
    return err
}

function parse(message, location) {
    var err = new Error(message)
    err.name = 'ParseError'
    err.location = location || null
    return err
}
