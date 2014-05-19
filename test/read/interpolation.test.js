'use strict';

var test = require('tape')
var Interpolation = require('../../lib/read/interpolation')
var Scope = require('../../lib/scope')

var TEST_ITR = '$(path)/$$beep$bar.js'

test('read.Interpolation()', function (t) {
    var itr = new Interpolation(TEST_ITR)
    var sc = new Scope()
    sc.set('path', 'a/b')
    sc.set('bar', 'boop')
    t.same(itr.values, ['path', 'bar'])
    t.equal(itr.expand(sc), 'a/b/$beepboop.js')
    t.end()
})
