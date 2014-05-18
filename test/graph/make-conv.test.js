'use strict';

var test = require('tape')
var makeConv = require('../../lib/graph/make-conv')

test('graph.makeConv() single star', function (t) {
    var conv = makeConv('source/*.c', 'build/*.o')
    t.equal(conv('source/foo.c'), 'build/foo.o')
    t.equal(conv('source/bar.c'), 'build/bar.o')
    t.end()
})

test('graph.makeConv() double star', function (t) {
    var conv = makeConv('source/**/*.c', 'build/**/*.obj')
    t.equal(conv('source/path/to/foo.c'), 'build/path/to/foo.obj')
    t.end()
})
