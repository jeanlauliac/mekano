'use strict';
module.exports = Interpolation

var MISSING_PAREN = 'missing interpolation closing parenthesis'

var RE_NAME_CHAR = /[a-zA-Z0-9_-]/

function Interpolation(str, location) {
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
    this._parts.forEach(function (part) {
        if (part.val) {
            str += scope.get(part.str)
            return
        }
        str += part.str
    })
    return str
}
