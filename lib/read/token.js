'use strict';
module.exports = Token

Token.WHITESPACE = 1
Token.COMMENT = 2
Token.REQUIRE = 10
Token.IDENTIFIER = 11
Token.PATH = 12
Token.PATH_GLOB = 13
Token.COMMAND = 20
Token.VALUE = 21
Token.PIPE = 30
Token.DOUBLE_PIPE = 31
Token.CHEVRON = 32
Token.PIPE_CHEVRON = 33

function Token(location, type, value) {
    this._type = type
    this._value = value || null
    this._location = location.clone()
}
