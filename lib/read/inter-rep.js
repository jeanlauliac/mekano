'use strict';
module.exports = {
    Trans: Trans
  , Alias: Alias
}

var defProp = require('../def-prop')

function Trans(prereqs, ast) {
    defProp(this, 'prereqs', prereqs)
    defProp(this, 'ast', ast)
}

function Alias(ast, targets) {
    defProp(this, 'ast', ast)
    defProp(this, 'targets', targets)
}
