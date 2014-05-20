'use strict';
module.exports = queuedFnOf

function queuedFnOf(fn, maxCount) {
    var currentCount = 0
    var queue = []
    return function queuedFn() {
        var args = Array.prototype.slice.call(arguments)
        var cb = args.pop()
        args.push(function queuedCb() {
            cb.apply(null, arguments)
            if (queue.length > 0) {
                return fn.apply(null, queue.shift())
            }
            currentCount--
        })
        if (currentCount < maxCount) {
            currentCount++
            return fn.apply(null, args)
        }
        queue.push(args)
    }
}
