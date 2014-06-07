# Update modules

## log

    var Log = require('./log')

### Class: Log

#### new Log(imps, opts)

  * `imps` **Object** Map giving imprints from files (eg. `{"foo.js":
    "123123213"}`).
  * `opts` **Object**:
    * `fs` **Object** Custom [filesystem](http://nodejs.org/api/fs.html) module
      to use.

#### Log.fromStream(stream, cb)

  * `stream` **Stream** to read JSON from.
  * `cb` **Function** with:
    * `err` **Error**
    * `log` **Log**

#### log.save(stream)

  * `stream` **Stream** to save JSON to.

#### log.refresh(cb)

  * `cb` **Function** with:
    * `err` **Error**

Make sure all the files known by the log still exist. It uses `fs.lstat`, and
remove a file from the log if the `ENOENT` error is returned.

#### log.isGenerated(path)

  * `path` **String**
  * Return **Boolean**

Test if a file is known by the log.

#### log.isUpToDate(path, imp)

  * `path` **String**
  * `imprint` **Number**
  * Return **Boolean**

Retun `true` is the imprint matches the log.

#### log.update(path, imp)

  * `path` **String**
  * `imprint` **Number**

#### log.forget(path)

  * `path` **String**

Remove the file from the log.

#### log.getPaths()

Get an array of all the known file paths.

## run-edges

    var runEdges = require('./run-edges')

### runEdges(edges, runEdge, opts)

  * `edges` **Array** of graph edges to the run.
  * `runEdge` **Function** called for each edge, possibly concurrently, with
    those arguments:
    * `edge` **graph.Edge** to process.
    * `callback` **Function** to be called when the edge is processed, with:
      * `err` **Error** that possibly occured, or `null`.
  * `opts` **Object**:
    * `concurrency` **Number** of the allowed maximum of concurrent edges being
      run (1 by default).
    * `shy` **Boolean** In shy mode, the algorithm aborts as soon as an error
      occurs.
  * Return the **RunEdgesTask**.

Run the specified edges with the specified function. The algorithm take care to
run an edge only when dependencies have been run. It starts with edges with
no or done dependencies. A dependency that is not part of the `edges` array is
considered as done.

### Class: RunEdgesTask

#### task.abort([signal])

  * `signal` **String**. If any, the signal, or `null`.

Abort the task. The edges being run are waited for before finishing.

#### Events: 'error', 'warning'

  * `err` **Error**. The error or warning.

Emitted when running an edge raised an error.

#### Event: 'finish'

  * `signal` **String** that caused abortion, if any.

Emitted when all edges have been updated, or if the algorithm has been aborted.
