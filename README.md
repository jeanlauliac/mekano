neomake
=======

*neomake* – maintain, update and regenerate groups of files.

*neomake* is a general-purpose build system. It is driven by a domain-
specific language. Most of the language and system is inspired by the UNIX
*make(1)* command, of which it tries to be a 21th-century alternative.

This command-line tool implementation is made with JavaScript on top of Node.js,
but is usable for any purpose: C/C++ compilation, web application assets
concatenation and minification, transpilation, etc.

Install
-------

    npm install neomake

The tool will be available in `node_modules/.bin/neomake`. It is **not**
recommended to install it globally because different projects may need different
versions.

Description
-----------

The *neomake* utility updates file that are derived from other files. A
typical case is creating a minified JavaScript from a plain JavaScript.
*neomake* examines time relationships and updates the derived files, called
targets, that have modified times earlier than the modified times of the
files from which they are derived, called prerequisites. A description file
(called neomakefile) contains a description of the relationships between files,
and the commands that need to be executed to update the targets to reflect
changes in their prerequisites.

Usage
-----

    make [options] [targets...]

Options:

  * **-f** *neomakefile* Specify a different neomakefile.
  * **-k** Continue to update other non-dependent targets if an error occurs.
  * **-n** Write commands that would be executed on standard output, but do
    not execute them.
  * **-q** Return a zero exit value if the targets are up to date; otherwise,
    return 1. No target is updated.
  * **-s** Be silent: don't write executed commands.

----

**The following sections are non-normative.**

Example
-------

    bin = node_module/.bin/
    coffee = $(bin)coffee
    minify = $(bin)node_module/.bin/minify

    all: dist/*.min.js

    dist/*.min.js: dist/*.js
        do: $minify < $in > $out

    dist/concat.js: build/script/**/*.js
        do: cat $in > $out

    build/script/**/*.js: source/script/**/*.coffee
        show: COFFEE $in
        do: $coffee $in > $out

