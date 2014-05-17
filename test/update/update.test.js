'use strict';

var test = require('tape')
var Graph = require('../../lib/graph/graph')
var update = require('../../lib/update/update')

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

var TEST_SUBGRAPH = [foo_o, foo_c, a_out, bar_o, bar_c]

var TEST_FS = {
    lstat: function (path, cb) {
        return cb(null, {mtime: new Date(42)})
    }
}

test('update.update()', function (t) {
    update(TEST_FS, TEST_GRAPH, TEST_SUBGRAPH, function (err) {
        t.error(err)
        t.end()
    }).on('progress', function (st) {
        console.error('[%d/%d]', st.done, st.total, st.edge.outFiles)
    })
})
