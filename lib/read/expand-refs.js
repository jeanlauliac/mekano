'use strict';
module.exports = expandRefs

var ast = require('./ast')
var errors = require('../errors')

function expandRefs(refs, expandAlias) {
    if (!(refs instanceof Array)) throw errors.invalidArg('refs', refs)
    if (typeof expandAlias !== 'function')
        throw errors.invalidArg('expandAlias', expandAlias)
    var newRefs = []
    for (var i = 0; i < refs.length; ++i) {
        var ref = refs[i]
        if (!(ref instanceof ast.Ref)) throw errors.invalidArg('refs', refs)
        if (ref.isA(ast.Ref.PATH) || ref.isA(ast.Ref.PATH_GLOB)) {
            newRefs.push(ref)
            continue
        }
        var exp = expandAlias(ref)
        for (var j = 0; j < exp.length; ++j) newRefs.push(exp[j])
    }
    return newRefs
}
