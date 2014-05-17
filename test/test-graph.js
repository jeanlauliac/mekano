'use strict';

var Graph = require('../lib/graph/graph')

var res = {graph: new Graph()}

res.foo_c = res.graph.getFileByPath('foo.c')
res.foo_o = res.graph.getFileByPath('foo.o')
res.foo_d = res.graph.getFileByPath('foo.d')
res.bar_c = res.graph.getFileByPath('bar.c')
res.bar_o = res.graph.getFileByPath('bar.o')
res.bar_d = res.graph.getFileByPath('bar.d')
res.a_out = res.graph.getFileByPath('a.out')
res.graph.pushEdge({ast:{recipeName:'Compile'}}
                 , [res.foo_o, res.foo_d], [res.foo_c])
res.graph.pushEdge({ast:{recipeName:'Compile'}}
                 , [res.bar_o, res.bar_d], [res.bar_c])
res.graph.pushEdge({ast:{recipeName:'Link'}}
                 , [res.a_out], [res.foo_o, res.bar_o])

module.exports = res
