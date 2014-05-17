'use strict';

var test = require('tape')
var Graph = require('../../lib/graph/graph')
var sort = require('../../lib/update/sort')

var tg = require('../test-graph')

test('update.sort()', function (t) {
    var targets = [tg.a_out]
    var files = sort(targets)
    t.equal(files[0].path, 'foo.c')
    t.equal(files[1].path, 'foo.o')
    t.equal(files[2].path, 'bar.c')
    t.equal(files[3].path, 'bar.o')
    t.equal(files[4].path, 'a.out')
    t.end()
})

var TEST_GRAPH_CYCLE = new Graph()
var foo_c = TEST_GRAPH_CYCLE.getFileByPath('foo.c')
var foo_o = TEST_GRAPH_CYCLE.getFileByPath('foo.o')
var foo_d = TEST_GRAPH_CYCLE.getFileByPath('foo.d')
var a_out = TEST_GRAPH_CYCLE.getFileByPath('a.out')
TEST_GRAPH_CYCLE.pushEdge(null, [foo_d], [foo_o])
TEST_GRAPH_CYCLE.pushEdge(null, [foo_c], [foo_d])
TEST_GRAPH_CYCLE.pushEdge(null, [foo_o], [foo_c])
TEST_GRAPH_CYCLE.pushEdge(null, [a_out], [foo_o])

test('update.sort() cycle', function (t) {
    var targets = TEST_GRAPH_CYCLE.getFilesByPaths(['a.out'])
    try {
        sort(targets)
    } catch (err) {
        t.equal(err.message, 'file dependency cycle: ' +
            'foo.o -> foo.d -> foo.c -> foo.o')
        t.end()
    }
})
