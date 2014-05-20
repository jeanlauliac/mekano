'use strict';

var test = require('tape')
var queuedFnOf = require('../lib/queued-fn-of')

test('queuedFnOf()', function (t) {
    var order = []
    var pending = {}
    var finished = 0
    var finish = function () { finished++ }
    var qf = queuedFnOf(function (index, cb) {
        order.push(index)
        pending[index] = cb
    }, 2)
    qf(1, function () {
        finished++
        qf(4, finish)
    })
    qf(2, finish)
    qf(3, finish)
    t.same(order, [1, 2])
    process.nextTick(function () {
        pending[1]()
        t.same(order, [1, 2, 3])
        process.nextTick(function () {
            pending[3]()
            t.same(order, [1, 2, 3, 4])
            pending[2]()
            pending[4]()
            t.equal(finished, 4)
            t.end()
        })
    })
})
