'use strict';

setTimeout(function () {
    console.log('beep')
    process.exit(0)
}, 3000)

process.on('SIGINT', function sigint() {
    console.error('SURPRISE SIGINT!')
    process.removeListener('SIGINT', sigint)
    process.kill(process.pid, 'SIGINT')
})
