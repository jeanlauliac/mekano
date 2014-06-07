# Update modules

## runEdges(edges, runEdge, opts)

  * `edges` **Array** of graph edges to the run;
  * `runEdge` **Function** called for each edge, possibly concurrently;
  * `opts` **Object**:
    * `concurrency` **Number** of the allowed maximum of concurrent edges being
      run, 1 by default.
    * `shy` **Boolean** In shy mode, the algorithm aborts as soon as an error
      occurs.

Run the specified edges with the specified function. The algorithm take care to
run an edge only when dependencies have been run. It starts with edges with
no or done dependencies. A dependency that is not part of the `edges` array is
considered as done.
