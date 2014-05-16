'use strict';
module.exports = defProp

function defProp(o, name, value) {
    Object.defineProperty(o, name, {value: value, enumerable: true})
}
