'use strict';
module.exports = {
    Unit: Unit
  , Recipe: Recipe
  , Bind: Bind
  , Trans: Trans
  , Relation: Relation
  , Alias: Alias
}

var defProp = require('../def-prop')

function Unit(recipes, relations, binds) {
    defProp(this, 'relations', relations || [])
    defProp(this, 'recipes', recipes || {})
    defProp(this, 'binds', binds || {})
}

function Recipe(name, command, location) {
    defProp(this, 'name', name)
    defProp(this, 'command', command)
    defProp(this, 'location', location)
}

function Bind(name, value, location) {
    defProp(this, 'name', name)
    defProp(this, 'value', value)
    defProp(this, 'location', location)
}

function Relation(prereqList, transList, alias, location) {
    defProp(this, 'prereqList', prereqList)
    defProp(this, 'transList', transList)
    defProp(this, 'alias', alias || null)
    defProp(this, 'location', location || null)
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
