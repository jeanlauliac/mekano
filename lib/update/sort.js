'use strict';
module.exports = sort

function sort(targets) {
    var st = {marks: {}, stack: [], list: []}
    for (var i = 0; i < targets.length; ++i)
        visit(st, targets[i])
    return st.list
}

function visit(st, target) {
    var marks = st.marks
    if (marks.hasOwnProperty(target.path)) {
        if (!marks[target.path].visiting) return
        throw cycleError(st, target)
    }
    var mark = marks[target.path] = {
        file: target, visiting: true, index: st.stack.length
    }
    if (target.inEdge !== null) {
        st.stack.push(target)
        var inFiles = target.inEdge.inFiles
        for (var i = 0; i < inFiles.length; ++i) {
            visit(st, inFiles[i])
        }
        st.stack.pop()
    }
    mark.visiting = false
    st.list.push(target)
}

function cycleError(st, target) {
    var index = st.marks[target.path].index
    var str = target.path
    for (var j = st.stack.length - 1; j >= index; --j) {
        str += ' -> ' + st.stack[j].path
    }
    throw new Error('file dependency cycle: ' + str)
}
