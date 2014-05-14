'use strict';
module.exports = {
    Unit: Unit
  , Recipe: Recipe
  , Bind: Bind
  , Trans: Trans
  , Relation: Relation
  , Alias: Alias
}

function Unit(recipes, relations, binds) {
    defProp(this, 'recipes', recipes || [])
    defProp(this, 'relations', relations || [])
    defProp(this, 'binds', binds || [])
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
    defProp(this, 'alias', alias || null)
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
