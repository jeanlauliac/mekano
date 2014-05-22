'use strict';
module.exports = Token

var errors = require('../errors')
var Location = require('./location')

// Specials
Token.END = 0
Token.WHITESPACE = 1
Token.COMMENT = 2

// References
Token.IDENTIFIER = 10
Token.PATH = 11
Token.PATH_GLOB = 12
Token.INTERPOLATION = 13

// Operators
Token.ARROW = 30
Token.FAT_ARROW = 31
Token.COLON = 32
Token.DOUBLE_COLON = 33
Token.SEMICOLON = 34
Token.EQUAL = 35

// Keywords
Token.REQUIRE = 60
Token.ONLYWITH = 61
Token.EXCEPT = 62
Token.FINAL = 63
Token.IF = 64
Token.THEN = 65
Token.ELSE = 66

function Token(type, value, location) {
    if (typeof type !== 'number') throw errors.invalidArg('type', type)
    if (location && !(location instanceof Location))
        throw errors.invalidArg('location', location)
    Object.defineProperty(this, 'type', {value: type, enumerable: true})
    var opts = {value: value || null, enumerable: true}
    Object.defineProperty(this, 'value', opts)
    opts = {value: location ? location.clone() : null, enumerable: true}
    Object.defineProperty(this, 'location', opts)
}

Token.prototype.toString = function() {
    var str = '{' + this.location.toString() + ':'
    for (var name in Token) {
        if (Token[name] === this.type) {
            str += name
            break
        }
    }
    if (this.value !== null)
        str += ' "' + this.value + '"'
    return str + '}'
}
