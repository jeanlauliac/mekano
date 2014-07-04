'use strict';

var test = require('tape')
var EdgeRunner = require('../../lib/update/edge-runner')

var tg = require('../test-graph')

test('update.EdgeRunner', function (t) {
    var cmds = {}
    cmds[tg.a_out.inEdge.index] = 'link foo.o bar.o'
    cmds[tg.foo_o.inEdge.index] = 'cc foo.c'
    cmds[tg.bar_o.inEdge.index] = 'cc bar.c'
    var te = new TestExec()
    var opts = {mkdirP: mkdirP, exec: te.run.bind(te)}
    var er = new EdgeRunner(cmds, opts)
    er.run(tg.foo_o.inEdge, function a(err) {
        t.error(err)
        t.equal(te.cmds[0], 'cc foo.c')
    })
    er.run(tg.bar_o.inEdge, function b(err) {
        t.error(err)
        t.equal(te.cmds[1], 'cc bar.c')
        var order = false
        er.run(tg.a_out.inEdge, function c(err) {
            t.equal(err.signal, 'SIGTERM')
            t.equal(order, true)
            t.end()
        })
        er.abort('SIGTERM')
        order = true
    })
})

function TestExec() {
    this.cmds = []
}

TestExec.prototype.run = function (cmd, cb) {
    this.cmds.push(cmd)
    setImmediate(cb.bind(null))
}

function mkdirP(dir, opts, cb) {
    return process.nextTick(cb.bind(null, null))
}
