'use strict';

var test = require('tape')
var Scope = require('../lib/scope')
var ast = require('../lib/read/ast')
var Interpolation = require('../lib/read/interpolation')

var TEST_BINDS = {
    truth: new ast.Bind('truth', new Interpolation('the $cake is a $lie'))
  , cake: new ast.Bind('cake', new Interpolation('super $beep'))
  , lie: new ast.Bind('lie', new Interpolation('big lie'))
  , beep: new ast.Bind('beep', new Interpolation('boop'))
}

test('Scope.fromBinds()', function (t) {
    var sc = new Scope.fromBinds(TEST_BINDS)
    t.equal(sc.get('truth'), 'the super boop is a big lie')
    t.end()
})
