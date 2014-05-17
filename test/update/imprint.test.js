'use strict';

var test = require('tape')
var Graph = require('../../lib/graph/graph')
var imprint = require('../../lib/update/imprint')

var TEST_GRAPH = new Graph()
var foo_c = TEST_GRAPH.getFileByPath('foo.c')
var foo_o = TEST_GRAPH.getFileByPath('foo.o')
var bar_c = TEST_GRAPH.getFileByPath('bar.c')
var bar_o = TEST_GRAPH.getFileByPath('bar.o')
var a_out = TEST_GRAPH.getFileByPath('a.out')
TEST_GRAPH.pushEdge(null, [foo_o], [foo_c])
TEST_GRAPH.pushEdge(null, [bar_o], [bar_c])
TEST_GRAPH.pushEdge(null, [a_out], [foo_o, bar_o])

var TEST_FILES = [foo_c, foo_o, bar_c, bar_o, a_out]

var TEST_CMDS = [
    'gcc -c foo.c -o foo.o'
  , 'gcc -c bar.c -o bar.o'
  , 'ld foo.o bar.o -o a.out'
]

var TEST_FS = {
    lstat: function (path, cb) {
        return cb(null, {mtime: new Date(42)})
    }
}

test('update.imprint()', function (t) {
    imprint(TEST_FS, TEST_FILES, TEST_CMDS, function testImps(err, imps) {
        TEST_FILES.forEach(function (file) {
            t.equal(typeof imps[file.path], 'number')
        })
        TEST_CMDS[0] = 'beep'
        imprint(TEST_FS, TEST_FILES, TEST_CMDS, function testImps2(err, imps2) {
            t.notEqual(imps['foo.o'], imps2['foo.o'])
            t.equal(imps['bar.o'], imps2['bar.o'])
            t.notEqual(imps['a.out'], imps2['a.out'])
            t.end()
        })
    })
})
