'use strict';

var test = require('tape')
var update = require('../../lib/update/update')

var tg = require('../test-graph')
var TEST_EDGES = [tg.a_out.inEdge, tg.foo_o.inEdge, tg.bar_o.inEdge]

var RES = ['foo.o', 'bar.o', 'a.out']

test('update.update()', function (t) {
    var i = 0
    var runEdge = function (edge, cb) {
        t.equal(edge.outFiles[0].path, RES[i])
        process.nextTick(cb.bind(null, null))
        i++
    }
    update(TEST_EDGES, runEdge, function (err) {
        t.error(err)
        t.end()
    })
})
