'use strict';

var test = require('tape')
var runEdges = require('../../lib/update/run-edges')

var tg = require('../test-graph')
var TEST_EDGES = [tg.a_out.inEdge, tg.foo_o.inEdge, tg.bar_o.inEdge]

var RES = ['foo.o', 'bar.o', 'a.out']

var DEF_OPT = {concurrency: 4}

test('update.runEdges()', function (t) {
    var i = 0
    var runEdge = function (edge, cb) {
        t.equal(edge.outFiles[0].path, RES[i])
        setImmediate(cb.bind(null, null))
        i++
    }
    runEdges(TEST_EDGES, runEdge, DEF_OPT).on('finish', function () {
        t.equal(i, 3)
        t.end()
    })
})

test('update.runEdges() w/ error', function (t) {
    var i = 0
    var runEdge = function (edge, cb) {
        t.equal(edge.outFiles[0].path, RES[i])
        var err = i === 0 ? new Error('some error') : null
        setImmediate(cb.bind(null, err))
        i++
    }
    runEdges(TEST_EDGES, runEdge, DEF_OPT).on('finish', function () {
        t.equal(i, 2)
        t.end()
    }).on('error', function (err) {
        t.equal(err.message, 'some error')
    })
})

test('update.runEdges() w/ error, shy', function (t) {
    var i = 0
    var runEdge = function (edge, cb) {
        t.equal(edge.outFiles[0].path, RES[i])
        var err = i === 0 ? new Error('some error') : null
        setImmediate(cb.bind(null, err))
        i++
    }
    var opts = {concurrency: 1, shy: true}
    runEdges(TEST_EDGES, runEdge, opts).on('finish', function () {
        t.equal(i, 1)
        t.end()
    }).on('error', function (err) {
        t.equal(err.message, 'some error')
    })
})
