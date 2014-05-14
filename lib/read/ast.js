'use strict';
module.exports = {
    Unit: Unit
  , Recipe: Recipe
  , Bind: Bind
}

function Unit() {
    Object.defineProperty(this, 'recipes', {value: [], enumerable: true})
    Object.defineProperty(this, 'relations', {value: [], enumerable: true})
    Object.defineProperty(this, 'values', {value: [], enumerable: true})
}

function Recipe(name, command) {
    Object.defineProperty(this, 'name', {value: name, enumerable: true})
    Object.defineProperty(this, 'command', {value: command, enumerable: true})
}

function Bind(name, value) {
    Object.defineProperty(this, 'name', {value: name, enumerable: true})
    Object.defineProperty(this, 'value', {value: value, enumerable: true})
}
