neomake
=======

**Work in progress, this is very early.**

*neomake* – maintain, update and regenerate groups of files.

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
properly takes account of removed and added files, and tracks command-line
changes. The system is largely inspired by the UNIX *make(1)* command, of which
it modestly tries to be a 21th-century alternative.

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

    neomake <command> [options] [macro=value] [target_name...]

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
  * **clean** Remove the specified targets and intermediary files. Options:
      * **-n, --dry-run** Output files to be removed. No file is removed.
  * **aliases** Display a list of the defined aliases.
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

A neomakefile can contain recipes, relations, and values.
Comments start with '#', ending with the next new line.

### Recipes

A recipe is formatted as below:

    name: command line [{
        [value_name = content...]
    }]

There can only be a single command in a recipe. Multiple processes can be
launched using the shell operators ';' (escaped with '\'), '&&', '&', '|' or
'||'.

White-space is removed on the command both ends. The command line can span
multiple lines by escaping the end of line with '$'. Any symbol can also be
escaped with '$'. Command lines can refer to existing values with '$name' or
'$(name)'. Additionally, the following values are available during evaluation:

  * **in** Space-separated shell-quoted list of the input file(s).
  * **out** Space-separated shell-quoted list of the output file(s).

Command lines are evaluated by the local shell, typically with `sh -c`.

'UpperCamel' case is suggested for naming recipes.

### Relations

A relation is formatted as below:

    <prerequisite> [, prerequisite...] <transformation...>

Where each transformation is one of:

    (| or ||)  <recipe_name> [{ [value_name = content...] }] > <target> [, target...]
    |> <alias> ["<description>"]

An alias can only be at the end of a relation. A prerequisite or a target may be
either a single file path or a globling pattern. A path always contains a
directory specifier, for example './foo' instead of just 'foo'. On the other
hand, an alias name cannot contain '/' or '.' characters.

During evaluation, multi-transformation relations are expanded to multiple
single-transformation relations. As such, this statement:

    ./foo.c | Compile > ./foo.o | Link > ./a.out |> all

is equivalent to:

    ./foo.c | Compile > ./foo.o
    ./foo.o | Link > ./a.out
    ./a.out |> all

Any output directory containing targets is automatically created by *neomake*
during the update.

There are two kind of transformations with *neomake*:

  * **plain** transformations noted with a single pipe '|'. In this case,
    the recipe is invoked with all the input files, and is assumed to produce
    all the output files.

  * **pair** transformations noted with a double pipe '||'.
    Those let you associate prerequisites and targets by pairs. For example,
    `./foo.c ./bar.c || Compile > ./foo.o ./bar.o` is equivalent to:

        ./foo.c | Compile > ./foo.o
        ./bar.c | Compile > ./bar.o


### Values

A value definition is formatted as below:

    name = content

A value cannot be unbound or overridden. The content can refer to existing
values with '$name' or '$(name)'. Example:

    bin = node_module/.bin
    coffee = $bin/coffee

Evaluation
----------

Example
-------

    require "neomake-utils" ;

    bin = "node_module/.bin/" ;

    Concat .. cat $in > $out
    Coffee .. $(bin)coffee $in > $out
    Minify .. $(bin)minify < $in > $out

    source/script/**/*.coffee
        || Coffee > build/script/**/*.js
         | Concat > dist/concat.js ;

    dist/*.js | Minify > dist/*.min.js |> all "Update all files" ;
