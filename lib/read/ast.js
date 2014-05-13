'use strict';
module.exports = {
    Unit: Unit
  , Recipe: Recipe
  , Value: Value
}

function Unit() {
    Object.defineProperty(this, 'recipes', {value: []})
    Object.defineProperty(this, 'relations', {value: []})
    Object.defineProperty(this, 'values', {value: []})
}

function Recipe(name, command) {
    Object.defineProperty(this, 'name', {value: name})
    Object.defineProperty(this, 'command', {value: command})
}

function Value(name, content) {
    Object.defineProperty(this, 'name', {value: name})
    Object.defineProperty(this, 'content', {value: content})
}
