'use strict';
module.exports = mergeLists

var errors = require('./errors')

function mergeLists(a, b, comp) {
    if (!(a instanceof Array)) throw errors.invalidArg('a', a)
    if (!(b instanceof Array)) throw errors.invalidArg('b', b)
    if (typeof comp !== 'function') throw errors.invalidArg('comp', comp)
    a.sort(comp)
    b.sort(comp)
    return mergeSortedLists(a, b, comp)
}

function mergeSortedLists(a, b, comp) {
    var i = 0, j = 0
    var res = []
    while (i < a.length && j < b.length) {
        var c = comp(a[i], b[j])
        if (c < 0) {
            res.push(a[i])
            i++
        } else if (c > 0) {
            res.push(b[j])
            j++
        } else {
            res.push(a[i])
            i++
            j++
        }
    }
    for (; i < a.length; ++i) res.push(a[i])
    for (; j < b.length; ++j) res.push(b[j])
    return res
}
