neomake
=======

**Work in progress, this is very early.**

tl;dr
-----

*neomake* is a make-like update tool: you have a bunch of files in some
directories, you want to generate other files from them. You want this simple
process to be balanced between speed and convenience. You want it not to be tied
to any specific technology. *neomake* aims to fix the frustration that can occur
working with GNU *make(1)* on small or medium projects.

Synopsis
--------

*neomake* maintain, update and regenerate groups of files.

*neomake* is a general-purpose update tool. It examines changes made and updates
derived files, called the targets, from the files they are derived, called the
prerequisites. Typical cases include (non-exhaustive):

  * compiling a group of C/C++ files to their respective object files;
  * linking a group of object files to a single binary;
  * transpiling a plain JavaScript to a minified JavaScript.

A description file (called neomakefile) contains a description of the
relationships between files, and the commands that need to be executed to update
the targets and reflect changes in their prerequisites.

*neomake* focuses on correctness rather than other factors like speed. It
properly takes account of removed and added files, tracks command-line changes,
and automatically create output directories. The system is largely inspired by
the UNIX *make(1)* command, of which it modestly tries to be a 21th-century
alternative.

*neomake* is not well suited for plain tasks (eg. 'test', 'publish'), the focus
is on updating files. Scripts are probably a better idea (eg. sh, JS, python).

The neomakefile is generally meant to be written by hand, but there is very
little support for build-time decision-making (no 'if', no macros). You can
instead use a dedicaced macro language, or generate from a script.

This specific implementation is made with JavaScript on top of Node.js,
but is usable for any purpose, from C/C++ compilation to web assets build.
It also aims to be easily multiplatform.

Install
-------

    npm install neomake

The tool will be available in `node_modules/.bin/neomake`. It is not recommended
to install it globally, because different projects may need different versions.
This allows the project to evolve faster and introduce breaking changes.

To avoid typing the path everytime when installed locally, one decent solution
is to create an alias, if your shell supports it:

```bash
alias neo=node_modules/.bin/neomake
```

Usage
-----

    neomake <command> [options] [macro=value...] [target_name...]

Commands:

  * **update** Update the specified targets. Everything is updated if no
    target is specified. Options:
      * **-k, --greedy** Continue to update feasible targets if an
        error occurs. This is useful to get a maximum of errors at once.
      * **-n, --dry-run** Output commands that would be run.
        No target is updated.
      * **-w, --watch** Watch files and update targets on prerequisite changes.
        Keep running until a signal is caught.
  * **status** Display the modified files and dirty targets. No target is
    updated. If **--silent** is specified, return a zero exit value if the
    targets are up to date; otherwise, return 1.
  * **clean** Remove the specified and intermediary targets. Options:
      * **-n, --dry-run** Output files to be removed. No file is removed.
  * **aliases** Display a list of the defined aliases.
  * **trace** Display the neomakefile interpretation. Options:
      * **-d, --dot** Output the file graph in the graphviz dot format.
  * **help** Display neomake own help.

General options:

  * **-f, --file** *neomakefile* Specify a different neomakefile. If '-' is
    specified, the standard input is used.
  * **-s, --silent** Be silent: don't write executed commands.
  * **-F, --force** Force things, like overwriting modified files. Dangerous.

Macros and target names can be mixed on the command-line, but targets are always
evaluated last.

Without the option **-f**, *neomake* looks in sequence for the files
**./neomake** and **./Neomake**. The first found is read.

Signals
-------

If any of the SIGHUP, SIGTERM, SIGINT, and SIGQUIT signals is received, the
targets being processed are removed and the tool returns.

Syntax
------

A neomakefile can contain recipes, relations, and binds. Comments start with
`#`, and end with the next new line. Whitespace is never significant is all
other cases; that is why statements must be terminated with `;`.

    unit = { recipe | relation | bind }

### Recipes

Recipe grammar (in [EBNF](http://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_Form))
is as below:

    recipe = recipe-name, ":", command, bind-list, ";" ;
    recipe-name = identifier ;
    command = interpolation ;
    bind-list = [ "{", { bind } , "}" ]
    identifier = { ? A-Z, a-z, 0-9, '-' or '_' ? }
    interpolation = "`", ? any character ?, "`" ;

There can only be a single command in a recipe. However, multiple processes can
be launched using the shell operators `;`, `&&`, `&`, `|` or `||`. The command
can span several lines. Here a simple recipe example:

    Compile: `gcc -c $in -o $out`;

The command can contain the backtick character when escaped as `` $` ``. `$$`
yields a single dollar sign. Command lines can refer to bound values with
`$name` or `$(name)`. The following values are automatically available during
recipe evaluation:

  * **in** Space-separated shell-quoted list of the input file(s).
  * **out** Space-separated shell-quoted list of the output file(s).

A recipe can also bind local values with braces, for example:

    Compile: `$cc -c $in -o $out` { cc = `gcc $cflags` };

Command lines are evaluated by the local shell, typically with `sh -c`.

'UpperCamel' case is suggested for naming recipes.

### Relations

Relation grammar is as below:

    relation = path-list, { transformation }, { alias }, ";"
    transformation = recipe-name, ( "=>" | "->" ), path-list, bind-list
    alias = "::" alias-name, [ alias-description ]
    path-list = { path | path-glob | alias-name }
    alias-name = identifier
    alias-description = interpolation
    path = { ? alphanumeric character with at least a '.' or a '/' ? }
    path-glob = { ? same as path, but with at least a '*', '**' or '{,}' operator ? }

A prerequisite or a target may be either a single file path or a globling
pattern. A path always contains a directory specifier, for example `./foo`
instead of just `foo`. `foo.js` is also recognized as a path thanks to the dot.
On the other hand, an alias name cannot contain '/' or '.' characters.
Here a simple relation example:

    source/*.c Compile => obj/*.o Link -> ./hello_world
        :: all `Build the hello world program`;

#### Expansions

During evaluation, multi-transformation relations are internally expanded to
multiple single-transformation relations. As such, this statement:

    foo.c Compile -> foo.o Link -> a.out :: all

is equivalent to:

    foo.c Compile -> foo.o
    foo.o Link -> a.out
    a.out :: all

#### Transformations

There are two kind of transformations with *neomake*:

  * **plain** transformations noted with a simple arrow '->'. In this case,
    the recipe is invoked with all the input files, and is assumed to produce
    all the output files.

  * **pair** transformations noted with a fat arrow '=>'. Those let you
    associate prerequisites and targets by pairs, in order. For example,
    `foo.c bar.c Compile => foo.o bar.o` is equivalent to:

        foo.c Compile -> foo.o
        bar.c Compile -> bar.o

#### Patterns

Globbing patterns can appear both as prerequisites and targets, but yield
different results. Prerequisite patterns expand in two steps:

  * First, *neomake* looks for existing files matching the pattern. Those are
    the original sources.
  * Then, it looks for other relations' targets matching the pattern. Those are
    intermediate files.

Target patterns always expand as a result of the prerequisites. For each
prerequisite found, *neomake* performs a transposition with the rules below:

  * the `**` path(s) is transfered to the corresponding `**`;
  * the `*` pathname(s) is transfered to the corresponding `*`.

For example, for a relation `src/**/*.c Compile => obj/**/*.o`, if a file
`src/a/foo.c` was found, the target pattern is expanded to `obj/a/foo.o`.
Since it is a pair transformation, each file will effectively be compiled to
its object counterpart separately.

### Binds

Value bind grammar is as below:

    bind = value-name, interpolation, ";"
    value-name = identifier

A value cannot be unbound or overridden. Interpolations can refer to existing
values with '$name' or '$(name)'. Example:

    bin = `node_module/.bin`;
    coffee = `$bin/coffee`;

<!---
### Directives

`require <name>` imports another neomakefile recipes, relations, and values.
'name' is either a path, or an identifier; in this case *neomake* import the
'main' file specified in `node_modules/<name>/package.json`.
-->

File update
-----------

Once the neomakefile has been interpreted, *neomake* executes the steps below.

  * Determine the hierarchy of prerequisites involved to update the specified
    targets.
  * Compare the timestamp of the prerequisites with the build log. Mark
    changed files as dirty.
  * Mark targets as dirty when at least one prerequisite is dirty, or if the
    recipe command changed according with the build log.
  * Invoke recipes in order to update files. When possible, recipes are
    called asynchronously to make the update faster.

Any output directory containing targets is automatically created by *neomake*
during the update.

Example
-------

    bin = `node_module/.bin`;

    Concat: `cat $in > $out`;
    Coffee: `$bin/coffee $in > $out`;
    Minify: `$bin/minify < $in > $out`;

    source/**/*.coffee
        Coffee => build/**/*.js
        Concat -> dist/concat.js;

    dist/*.js
        Minify => dist/*.min.js
        :: all `Update all files`;

Running *neomake*:

    $ neomake update
    [        ]   0.0%   Coffee source/foo.coffee -> build/foo.js
    [##      ]  25.0%   Coffee source/bar.coffee -> build/bar.js
    [####    ]  50.0%   Concat build/foo.js build/bar.js -> dist/concat.js
    [######  ]  75.0%   Minify dist/concat.js -> dist/concat.min.js
    [########] 100.0%   Updated.
    $ neomake update
    Everything is up to date.

Trivia
------

### Why not reusing the make syntax?

The classic *make* syntax "targets: prerequisites" is not employed because:

  * it may not be very clear how to express transformation chains (something
    like `foo: bar: glo`?);
  * inference is done the other way around than *make* (it infers targets based
    on prerequisites; make does the contrary with rules like `%.o: %c`).
