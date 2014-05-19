'use strict';
module.exports = Scope

var util = require('util')

function Scope(parent) {
    this._parent = parent || null
    this._values = {}
}

Scope.prototype.set = function(name, value) {
    this._values[name] = value
}

Scope.prototype.get = function(name) {
    if (this._values.hasOwnProperty(name)) return this._values[name]
    if (this._parent) return this._parent.get(name)
    throw new Error(util.format('unbound value `%s\'', name))
}

Scope.fromBinds = function (binds, parent) {
    var scope = new Scope(parent)
    var st = {binds: binds, marks: {}, scope: scope, stack: []}
    for (var name in binds) {
        if (!binds.hasOwnProperty(name)) continue
        if (st.marks.hasOwnProperty(name)) continue
        expandBind(st, name)
    }
    return scope
}

function expandBind(st, name) {
    if (st.marks.hasOwnProperty(name)) {
        if (st.marks[name].done === true) return
        throw cycleError(st, st.marks[name].index)
    }
    st.marks[name] = {done: false, index: st.stack.length}
    st.stack.push(name)
    var bind = st.binds[name]
    for (var i = 0; i < bind.value.values.length; ++i) {
        var subName = bind.value.values[i]
        if (!st.binds.hasOwnProperty(subName)) continue
        expandBind(st, subName)
    }
    var str = bind.value.expand(st.scope)
    st.scope.set(name, str)
    st.stack.pop()
    st.marks[name].done = true
}

function cycleError(st, index) {
    var str = st.stack[index].name
    for (var j = st.stack.length - 1; j >= index; --j) {
        str += ' -> ' + st.stack[j].name
    }
    return new Error('circular value reference ' + str)
}
