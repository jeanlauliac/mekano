mekano
======

**Work in progress, this is very early.**

Synopsis
--------

*mekano(1)* – maintain, update and regenerate groups of files.

*mekano*:

  * is a make-like update tool: you have a bunch of files in some directories,
    you want to generate other files from them;
  * liberally aims to lessen the frustration that can occur working with GNU
    *make(1)* on small or medium projects;
  * tries to be balanced between speed and convenience;
  * is not tied to any specific technology and may be used to compile C/C++,
    build a web application Javascript/CSS assets, or brew your coffee.

Example
-------

In `./Mekanofile`:

    bin = `node_module/.bin`;

    Concat: `cat $in > $out`;
    Coffee: `$bin/coffee $in > $out`;
    Minify: `$bin/minify < $in > $out`;

    source/**/*.coffee
        Coffee => build/**/*.js
        Concat -> dist/concat.js;

    dist/*.js
        Minify => dist/*.min.js
        :: all `the minified JS`;

In your preferred shell:

    $ ls
    Mekanofile    source

    $ mekano update
    Updating...  25.0%   Coffee source/foo.coffee -> build/foo.js
    Updating...  50.0%   Coffee source/bar.coffee -> build/bar.js
    Updating...  75.0%   Concat build/foo.js build/bar.js -> dist/concat.js
    Updating... 100.0%   Minify dist/concat.js -> dist/concat.min.js
    Done.

    $ mekano update
    Everything is up to date.

    $ ls
    Mekanofile    source      build       dist        .mekano

    $ ls dist
    concat.js   concat.min.js

Description
-----------

*mekano* is a general-purpose update tool. It examines changes made and updates
derived files, called the targets, from the files they are derived, called the
prerequisites. Typical cases include (non-exhaustive):

  * compiling a group of C/C++ files to their respective object files;
  * linking a group of object files to a single binary;
  * transpiling a plain JavaScript to a minified JavaScript.

A description file (called mekanofile) contains a description of the
relationships between files, and the commands that need to be executed to update
the targets and reflect changes in their prerequisites.

*mekano* focuses on correctness rather than other factors like speed. It
properly takes account of removed and added files; tracks command-line changes;
automatically create output directories; and provides sane semantics for
dependency definitions. This tool is largely inspired by the UNIX *make(1)*
utility, of which it modestly tries to be a 21th-century alternative.

*mekano* only knows how to update files. It is not well suited for 'tasks' (eg.
'test', 'publish'). Plain scripts are probably a better idea (eg. sh, JS,
python) for those.

The mekanofile is generally meant to be written by hand, but there is very
little support for build-time decision-making (no 'if', no macros). However, you
can easily use a dedicaced macro or procedural language to generate the
mekanofile.

This specific implementation is made with JavaScript on top of Node.js,
but is usable for any purpose, from C/C++ compilation to web assets build.
Node.js makes it easier to be multiplatform.

Install
-------

    npm install mekano

The tool will be available in `node_modules/.bin/mekano`. It is not recommended
to install it globally, because different projects may need different versions.
This allows the project to evolve faster and introduce breaking changes.

To avoid typing the path everytime when installed locally, one decent solution
is to create an alias, if your shell supports it. For example:

    $ alias mk=node_modules/.bin/mekano

If you later forget to `npm install` a project, your shell will just tell you:

    $ mk update
    bash: no such file or directory: node_modules/.bin/mekano

Usage
-----

    mekano <command> [options] [macro=value...] [target_name...]

Commands:

  * **update** Update the specified targets. All files are updated if no
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
  * **trace** Display the mekanofile interpretation. Options:
      * **-d, --dot** Output the file graph in the graphviz dot format.
  * **help** Display mekano own help.

General options:

  * **-f, --file** *mekanofile* Specify a different mekanofile. If '-' is
    specified, the standard input is used.
  * **-s, --silent** Be silent: don't write executed commands.
  * **-F, --force** Force things, like overwriting modified files. Dangerous.

Macros and target names can be mixed on the command-line, but targets are always
evaluated last.

Without the option **-f**, *mekano* looks in sequence for the files
**./Mekano** and **./mekano**. The first found is read.

Signals
-------

If any of the SIGHUP, SIGTERM, SIGINT, and SIGQUIT signals is received, the
targets being processed are removed and the tool returns.

Syntax
------

A mekanofile can contain recipes, relations, and binds. Comments start with
`#`, and end with the next new line. Whitespace is never significant is all
other cases; that is why statements must be terminated with `;`.

    unit = { recipe | relation | bind }

The golden rule when writing a mekanofile is that **order does not matter**.
Whatever the ordering of recipes, relations and binds is, the interpretation
will always be the same; even if glob patterns are involved. This makes the
syntax purely declarative.

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
'UpperCamel' case is suggested for naming recipes. Recipes can appear anywhere
in the mekanofile, either after or before the relations referring to it.

### Relations

Relation grammar is as below:

    relation = ref-list, { transformation }, [ alias ], ";"
    transformation = recipe-name, ( "=>" | "->" ), ref-list, bind-list
    alias = "::", alias-name, [ alias-description ]
    ref-list = { path | path-glob | alias-name }
    alias-name = identifier
    alias-description = interpolation
    path = { ? alphanumeric character with at least a '.' or a '/' ? }
    path-glob = { ? same as path, but with at least a '*', '**' or '{,}' operator ? }

A prerequisite or a target may be either a single file path or a globling
pattern. A path always contains one of `/` or `.`, for example `./foo`
instead of just `foo`; `foo.js` is also recognized as a path thanks to the dot.
On the other hand, an alias name cannot contain `/` or `.` characters.
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

There are two kind of transformations with *mekano*:

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

  * First, *mekano* looks for existing files matching the pattern. Those are
    the original sources.
  * Then, it looks for other relations' targets matching the pattern. Those are
    intermediate files.

Target patterns always expand as a result of the prerequisites. For each
prerequisite found, *mekano* performs a transposition with the rules below:

  * the `**` path(s) is transfered to the corresponding `**`;
  * the `*` pathname(s) is transfered to the corresponding `*`.

For example, for a relation `src/**/*.c Compile => obj/**/*.o`, if a file
`src/a/foo.c` was found, the target pattern is expanded to `obj/a/foo.o`.
Since it is a pair transformation, each file will effectively be compiled to
its object counterpart separately.

### Binds

Value bind grammar is as below:

    bind = value-name, "=", interpolation, ";"
    value-name = identifier

A value cannot be unbound or overridden. Interpolations can refer to existing
values with `$name` or `$(name)`. Example:

    bin = `node_module/.bin`;
    coffee = `$bin/coffee`;

A bound value is available anywhere in the mekanofile, even before the
declaration.

<!---
### Directives

`require <name>` imports another mekanofile recipes, relations, and values.
'name' is either a path, or an identifier; in this case *mekano* import the
'main' file specified in `node_modules/<name>/package.json`.
-->

File update
-----------

Once the mekanofile has been interpreted, *mekano* executes the steps below.

  * Determine the hierarchy of prerequisites involved to update the specified
    targets.
  * Compare the timestamp of the prerequisites with the build log. Mark
    changed files as dirty.
  * Mark targets as dirty when at least one prerequisite is dirty, or if the
    recipe command changed according with the build log.
  * Invoke recipes in order to update files. When possible, recipes are
    called asynchronously to make the update faster.

Any output directory containing targets is automatically created by *mekano*
during the update.

Trivia
------

### Why using this instead of make?

  * It is simpler to set up transformation of multiple files, with no need to
    write a list of files or use macros like `$(wildcard *.foo)`;
  * directories are handled automatically;
  * it detects command line changes;
  * is gives more 'sane' and strict semantics, like values instead of macros,
    reducing error risks.

### Why using this instead of grunt?

  * Minimal updates: files that did not change do not trigger update;
  * no plugin system, you can use tools from any package, in any version; 'less
    is more' applies pretty well to this case.

### Why *not* using mekano?

  * too high-level, you have specific dependency needs;
  * no logic, no 'if';
  * might be too slow for medium or large projects.

### Why not reusing the make syntax?

The classic *make* syntax "targets: prerequisites" is not employed because:

  * it may not be very clear how to express transformation chains (something
    like `foo: bar: glo`?);
  * inference is done the other way around than *make* (it infers targets based
    on prerequisites; make does the contrary with rules like `%.o: %c`).

### Shout out

To the masters from which *mekano* is inspired:

  * the historic [GNU make](http://www.gnu.org/software/make/manual/make.html);
  * the super-fast [Ninja](http://martine.github.io/ninja/);
  * the insightful [tup](http://gittup.org/tup/);
  * the pragmatic [grunt](http://gruntjs.com/).
