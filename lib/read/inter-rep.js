'use strict';
module.exports = {
    ExpRelation: ExpRelation
  , ExpTrans: ExpTrans
  , PlainTrans: PlainTrans
  , Alias: Alias
}

var defProp = require('../def-prop')

function ExpRelation(prereqs, transs) {
    defProp(this, 'prereqs', prereqs)
    defProp(this, 'transs', transs)
}

function ExpTrans(ast, targets) {
    defProp(this, 'ast', ast)
    defProp(this, 'targets', targets)
}

function PlainTrans(prereqs, ast) {
    defProp(this, 'prereqs', prereqs)
    defProp(this, 'ast', ast)
}

function Alias(ast, refs) {
    defProp(this, 'ast', ast)
    defProp(this, 'refs', refs)
}
