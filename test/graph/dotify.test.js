'use strict';

var fs = require('fs')
var test = require('tape')
var dotify = require('../../lib/graph/dotify')

var tg = require('../test-graph')

test('graph.dotify()', function (t) {
    var str = ''
    var stream = {write: function(s, e, cb) {
        str += s
        return process.nextTick(cb.bind(null, null))
    }}
    dotify(tg.graph, stream, function (err) {
        t.error(err)
        var target = fs.readFileSync(__dirname + '/dotify.dot', 'utf8')
        t.equal(str, target)
        t.end()
    })
})
