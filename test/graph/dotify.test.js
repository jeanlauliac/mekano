'use strict';

var fs = require('fs')
var test = require('tape')
var Graph = require('../../lib/graph/graph')
var dotify = require('../../lib/graph/dotify')

var TEST_GRAPH = new Graph()
var foo_c = TEST_GRAPH.getFileByPath('foo.c')
var foo_o = TEST_GRAPH.getFileByPath('foo.o')
var foo_d = TEST_GRAPH.getFileByPath('foo.d')
var bar_c = TEST_GRAPH.getFileByPath('bar.c')
var bar_o = TEST_GRAPH.getFileByPath('bar.o')
var bar_d = TEST_GRAPH.getFileByPath('bar.d')
var a_out = TEST_GRAPH.getFileByPath('a.out')
TEST_GRAPH.pushRelation('Compile', [foo_c], [foo_o, foo_d])
TEST_GRAPH.pushRelation('Compile', [bar_c], [bar_o, bar_d])
TEST_GRAPH.pushRelation('Link', [foo_o, bar_o], [a_out])

test('graph.dotify()', function (t) {
    var str = ''
    var stream = {write: function(s, e, cb) {
        str += s
        return process.nextTick(cb.bind(null, null))
    }}
    dotify(TEST_GRAPH, stream, function (err) {
        t.error(err)
        var target = fs.readFileSync(__dirname + '/dotify.dot', 'utf8')
        t.equal(str, target)
        t.end()
    })
})
