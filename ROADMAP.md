Roadmap
=======

Fancy features to add:

  * a `foreach` keyword expanding for each prerequisite, for example:

        foreach(foo.c bar.c) lib.h Compile -> foo.o bar.o foo.d bar.d

    would yield:

        foo.c lib.h Compile -> foo.o foo.d
        bar.c lib.h Compile -> bar.o bar.d

  * a `onlywith` keyword. This:

        *.c onlywith foo.c bar.c => *.o

    would only expand the fat arrow for the specified files.

  * an `except` keyword, the inverse of `onlywith`.

  * a `final` keyword, indicating that a globbing pattern expansion must not be
    propagated further. That would be useful to break dependency cycles. For
    example:

        *.coffee Coffee => *.js
        *.js GenCoffee => final *.gen.coffee

    In this case, no `*.gen.coffee` is not matched by the first rule, even if it
    exists on disk.

  * Implicit dependencies, accounted for as dependencies but not included in the
    $in value:

        foo.c | lib.h Compile -> foo.o

  * Automatic collection of implicit dependencies from compiler-generated
    dependency files (eg. `gcc -MM`).

  * Using interpolation in path lists (targets or prerequisites).

  * Implicit files:

        src/**/*.coffee
            Coffee => Concat -> dist/concat.js;

    The compiled JS files, in this case, are auto-named and placed in .mekano/.
