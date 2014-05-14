'use strict';
module.exports = {
    Unit: Unit
  , Recipe: Recipe
  , Bind: Bind
  , Trans: Trans
  , Relation: Relation
  , Alias: Alias
}

function Unit() {
    Object.defineProperty(this, 'recipes', {value: [], enumerable: true})
    Object.defineProperty(this, 'relations', {value: [], enumerable: true})
    Object.defineProperty(this, 'binds', {value: [], enumerable: true})
}

function Recipe(name, command) {
    Object.defineProperty(this, 'name', {value: name, enumerable: true})
    Object.defineProperty(this, 'command', {value: command, enumerable: true})
}

function Bind(name, value) {
    Object.defineProperty(this, 'name', {value: name, enumerable: true})
    Object.defineProperty(this, 'value', {value: value, enumerable: true})
}

function Relation(prereqList, transList, alias) {
    defProp(this, 'prereqList', prereqList)
    defProp(this, 'transList', transList)
    defProp(this, 'alias', alias)
}

function Trans(recipeName, multi, targets) {
    defProp(this, 'recipeName', recipeName)
    defProp(this, 'multi', multi)
    defProp(this, 'targets', targets)
}

function Alias(name, desc) {
    defProp(this, 'name', name)
    defProp(this, 'desc', desc)
}

function defProp(o, name, value) {
    Object.defineProperty(o, name, {value: value, enumerable: true})
}
