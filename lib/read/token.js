'use strict';
module.exports = Token

Token.END = 0
Token.WHITESPACE = 1
Token.COMMENT = 2
Token.REQUIRE = 10
Token.IDENTIFIER = 11
Token.PATH = 12
Token.PATH_GLOB = 13
Token.INTERPOLATION = 20
Token.ARROW = 30
Token.FAT_ARROW = 31
Token.COLON = 32
Token.DOUBLE_COLON = 33
Token.SEMICOLON = 34
Token.EQUAL = 35

function Token(location, type, value) {
    if (typeof type === 'undefined') throw new Error('type cannot be empty')
    Object.defineProperty(this, 'type', {value: type, enumerable: true})
    Object.defineProperty(this, 'value'
                        , {value: value || null, enumerable: true})
    Object.defineProperty(this, 'location'
                        , {value: location.clone(), enumerable: true})
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
