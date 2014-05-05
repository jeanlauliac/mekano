'use strict';
module.exports = Location

var util = require('util')

function Location(line, column) {
    this.line = line || 1
    this.column = column || 1
}

Location.prototype.forward = function (str) {
    for (var i = 0; i < str.length; ++i) {
        if (str[i] === '\n') {
            this.column = 1
            ;++this.line
        } else {
            ++this.column
        }
    }
}

Location.prototype.toString = function () {
    return util.format('%d:%d', this.line, this.column)
}

Location.prototype.clone = function() {
    return new Location(this.line, this.column)
}
