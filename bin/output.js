'use strict';
module.exports = Output

var readline = require('readline')

function Output(disableTTY) {
    this._inUpdate = false
    this._tty = !disableTTY && process.stdout.isTTY
}

Output.prototype.log = function () {
    this.endUpdate()
    console.log.apply(null, arguments)
}

Output.prototype.update = function (message) {
    if (!this._tty) return console.log(message)
    this._inUpdate = true
    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0)
    process.stdout.write(message, 'utf8')
}

Output.prototype.endUpdate = function() {
    if (!this._inUpdate) return
    console.log()
    this._inUpdate = false
}
