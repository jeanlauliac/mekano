'use strict';
module.exports = Token

Token.WHITESPACE = 1
Token.REQUIRE = 10
Token.IDENTIFIER = 11
Token.PATH = 12
Token.PATH_GLOB = 13
Token.COMMAND = 20
Token.VALUE = 21

function Token(type, value, location) {
    this._type = type
    this._value = value
    this._location = location.clone()
}
