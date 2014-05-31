'use strict';
module.exports = Interpolation

var Location = require('./location')
var errors = require('../errors')

var MISSING_PAREN = 'missing interpolation closing parenthesis'

var RE_NAME_CHAR = /[a-zA-Z0-9_-]/

function Interpolation(str, location) {
    if (typeof str !== 'string')
        throw errors.invalidArg('str', str)
    if (location && !(location instanceof Location))
        throw errors.invalidArg('location', location)
    this._parts = []
    this.values = []
    this.location = location || null
    var i = 0
    while (i < str.length) {
        var buffer = ''
        if (str[i] === '$') {
            i++
            if (str[i] === '(') {
                i++
                for (; i < str.length && str[i] !== ')'; i++) {
                    buffer += str[i]
                }
                if (i === str.length) throw new Error(MISSING_PAREN)
                i++
            } else if (RE_NAME_CHAR.test(str[i])) {
                for (; i < str.length && RE_NAME_CHAR.test(str[i]); i++) {
                    buffer += str[i]
                }
            } else {
                this._parts.push({val: false, str: str[i]})
                i++
            }
            if (buffer.length > 0) {
                this._parts.push({val: true, str: buffer})
                this.values.push(buffer)
            }
            continue
        }
        for (; i < str.length && str[i] !== '$'; i++) {
            buffer += str[i]
        }
        if (buffer.length > 0)
            this._parts.push({val: false, str: buffer})
    }
}

Interpolation.prototype.expand = function(scope) {
    var str = ''
    var self = this
    this._parts.forEach(function (part) {
        if (part.val) {
            try {
                str += scope.get(part.str)
            } catch (err) {
                err.location = self.location
                throw err
            }
            return
        }
        str += part.str
    })
    return str
}
