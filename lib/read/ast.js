'use strict';
module.exports = {
    Unit: Unit
  , Recipe: Recipe
  , Bind: Bind
  , Trans: Trans
  , Relation: Relation
  , Alias: Alias
  , Ref: Ref
}

var errors = require('../errors')
var Interpolation = require('./interpolation')
var Location = require('./location')
var defProp = require('../def-prop')

function Unit(recipes, relations, binds) {
    defProp(this, 'relations', relations || [])
    defProp(this, 'recipes', recipes || {})
    defProp(this, 'binds', binds || {})
}

function Recipe(name, command, location) {
    if (typeof name !== 'string') throw errors.invalidArg('name', name)
    if (!(command instanceof Interpolation))
        throw errors.invalidArg('command', command)
    if (location && !(location instanceof Location))
        throw errors.invalidArg('location', location)
    defProp(this, 'name', name)
    defProp(this, 'command', command)
    defProp(this, 'location', location)
}

function Bind(name, value, location) {
    if (typeof name !== 'string') throw errors.invalidArg('name', name)
    if (!(value instanceof Interpolation))
        throw errors.invalidArg('value', value)
    if (location && !(location instanceof Location))
        throw errors.invalidArg('location', location)
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
    if (typeof name !== 'string') throw errors.invalidArg('name', name)
    if (desc && typeof desc !== 'string') throw errors.invalidArg('desc', desc)
    defProp(this, 'name', name)
    defProp(this, 'desc', desc)
}

Ref.ALIAS = 1
Ref.PATH = 2
Ref.PATH_GLOB = 3

function Ref(type, value, location) {
    if (typeof type !== 'number') throw errors.invalidArg('type', type)
    if (typeof value !== 'string') throw errors.invalidArg('value', value)
    if (location && !(location instanceof Location))
        throw errors.invalidArg('location', location)
    defProp(this, 'type', type)
    defProp(this, 'value', value)
    defProp(this, 'location', location)
}
