'use strict';
module.exports = Task

var util = require('util')
var EventEmitter = require('events').EventEmitter

util.inherits(Task, EventEmitter)
function Task(abortFn) {
    EventEmitter.call(this)
    this._abortFn = abortFn
}

Task.prototype.abort = function() {
    this._abortFn()
}
