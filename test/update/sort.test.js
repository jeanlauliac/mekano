'use strict';

var test = require('tape')
var Graph = require('../../lib/graph/graph')
var sort = require('../../lib/update/sort')

var TEST_GRAPH = new Graph()
var foo_c = TEST_GRAPH.getFileByPath('foo.c')
var foo_o = TEST_GRAPH.getFileByPath('foo.o')
var foo_d = TEST_GRAPH.getFileByPath('foo.d')
var bar_c = TEST_GRAPH.getFileByPath('bar.c')
var bar_o = TEST_GRAPH.getFileByPath('bar.o')
var bar_d = TEST_GRAPH.getFileByPath('bar.d')
var a_out = TEST_GRAPH.getFileByPath('a.out')
TEST_GRAPH.pushEdge(null, [foo_o, foo_d], [foo_c])
TEST_GRAPH.pushEdge(null, [bar_o, bar_d], [bar_c])
TEST_GRAPH.pushEdge(null, [a_out], [foo_o, bar_o])

test('update.sort()', function (t) {
    var targets = TEST_GRAPH.getFilesByPaths(['a.out'])
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
