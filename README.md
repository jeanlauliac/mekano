mekano
======

[![Build Status](https://travis-ci.org/jeanlauliac/mekano.svg?branch=master)](https://travis-ci.org/jeanlauliac/mekano)

**This is still an alpha version of the tool, keep in mind the current version
is not feature-complete. Work is in progress toward that goal.**

Synopsis
--------

*mekano(1)* – maintain, update and regenerate groups of files.

*mekano*:

  * is a **make-like update tool**: you have a bunch of files in some
    directories, you want to **generate other files** from them, **fast** (no
    unnecessary work);
  * liberally aims to **lessen the frustration** that can occur working with GNU
    *make(1)* on small or medium projects;
  * tries to be balanced between **speed and convenience**;
  * works **best** with a **powerful shell** (like bash & co.), that it does not
    supplant;
  * is **not** tied to any **specific technology** and may be used to compile
    C/C++, build a web application Javascript/CSS assets, or **brew your
    coffee**.

Example
-------

In `./Mekanofile`:

    bin = `node_modules/.bin`;

    Concat: `cat $in > $out`;
    Coffee: `$bin/coffee -cp $in > $out`;
    Minify: `$bin/uglifyjs < $in > $out`;

    src/**/*.coffee
        Coffee => build/**/*.js
        Concat -> dist/concat.js;

    dist/*.js
        Minify => dist/*.min.js
        :: all `Update all files`;

In your preferred shell:

    $ ls
    Mekanofile    src

    $ mekano update
    Updating...  25.0%   Coffee src/foo.coffee -> build/foo.js
    Updating...  50.0%   Coffee src/bar.coffee -> build/bar.js
    Updating...  75.0%   Concat build/foo.js build/bar.js -> dist/concat.js
    Updating... 100.0%   Minify dist/concat.js -> dist/concat.min.js
    Done.

    $ mekano update
    Everything is up to date.

    $ ls
    Mekanofile    src      build       dist        .mekano

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

*mekano* focuses above all on correctness and convenience, then speed. It
properly takes account of removed and added files; tracks command-line changes;
automatically create output directories; and provides sane semantics for
dependency definitions. This tool is largely inspired by the UNIX *make(1)*
utility, of which it modestly tries to be a 21th-century alternative.

*mekano* only knows how to update files. It is not well suited for so-called
'tasks' (eg. 'test', 'publish'). Plain scripts are probably a better idea (with
bash, Javascript, Python…) for those. Using
[npm-scripts](https://www.npmjs.org/doc/misc/npm-scripts.html) is suggested
as well.

The mekanofile is generally meant to be written by hand, but there is, for now,
very little support for build-time decision-making (no 'if', no macros).
However, you can easily use a dedicaced macro or procedural language to generate
the mekanofile, like [m4](http://www.gnu.org/software/m4/manual/m4.html),
Python, Javascript…

This specific implementation is made with JavaScript on top of Node.js, but keep
in mind it is usable for any purpose, from C/C++ compilation to web assets
build. Node.js just makes it easier to be multiplatform.

Install
-------

**Important:** you need node v0.10 or higher to run this program.

    npm install mekano

The tool will be available as `node_modules/.bin/mekano`. It is not recommended
to install it globally, because different projects may need different major
and incompatible versions.

To avoid typing the path every time when installed locally, one decent solution
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

  * **plain** transformations noted with a simple arrow '->'.
    The recipe is invoked with all the input files, and is assumed to produce
    all the output files.

  * **generative** transformations noted with a fat arrow '=>'. A plain
    transformation is instantiated for each file matched in the prerequisite
    globbing pattern. For example, if we have two files `foo.c` and `bar.c`,
    the relation:

        *.c Compile => *.o *.d

    will expand to:

        foo.c Compile -> foo.o foo.d
        bar.c Compile -> bar.o bar.d

#### Patterns

Globbing patterns can appear both as prerequisites and targets, but yield
different results. Prerequisite patterns expand from two sources:

  * existing source files matching the pattern;
  * other relations' targets matching the pattern.

[Minimatch](https://github.com/isaacs/minimatch) is used to match the files.

Patterns as targets can only appear right of generative transformations. For
each prerequisite found, *mekano* performs a pattern transposition. Currently
the system is pretty limited and only the symbols `**` and `*` are accounted
for: it copies everything from the left of the first start, and right of the
last star.

For example, for a relation `src/**/*.c Compile => obj/**/*.o`, if a file
`src/a/foo.c` was found, the target pattern is expanded to `obj/a/foo.o`.
On the other hand, a pattern like `src/**/foo/*.c` won't work properly
because `/foo/` will be lost in the process.

Generative pattern transposition is planned to be improved in the future.

### Binds

Value bind grammar is as below:

    bind = value-name, "=", interpolation, ";"
    value-name = identifier

A value cannot be unbound or overridden. Interpolations can refer to existing
values with `$name` or `$(name)`. Example:

    bin = `node_module/.bin`;
    coffee = `$bin/coffee`;

A bound value is available anywhere in the mekanofile, even before the
declaration. The order of declaration does not matter; but you cannot have
circular references.

File update
-----------

Once the mekanofile has been interpreted, *mekano* executes the steps below.

  * Topologically sort the files considering their dependencies.
  * Determine the *imprint* of each file involved. The imprint is a
    [MurmurHash](http://en.wikipedia.org/wiki/MurmurHash) accounting for a
    file prerequisites and timestamp.
  * Determine which transformations are needed to be run by comparing imprints
    to the update log generated by the previous run of *mekano*, if any.
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
