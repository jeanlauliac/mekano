# Roadmap

## High priority

  * Implicit dependencies, accounted for as dependencies but not included in the
    $in value:

        foo.c | lib.h Compile -> foo.o

  * Automatic collection of implicit dependencies from inline sourcemaps. Files referenced in the
    sourcemap are automatically added as implicit dependencies, so that
    the file is re-updated when they change. For example, that means browserify
    will work beautifully out-of-the-box without the need to specify
    dependencies manually.

  * Using interpolation in path lists (targets or prerequisites):
    `` `$dist/a.out` ``.

  * Escaping in path lists: `"foo with spaces.c"`.

## Medium priority

  * Automatic collection of implicit dependencies from external sourcemaps.

  * Local bind scopes:

        Coffee: `$cf < $in > $out` { cf = `$coffee -cp` };

  * Recipe parameters:

        Coffee(debug): `$coffee -cp < $in > $out`
            { arg = if debug then `-d` else `` } ;

        *.coffee Coffee(no) -> *.js

## Low priority

  * Automatic collection of implicit dependencies from compiler-generated
    dependency files (eg. `gcc -MM`).

  * When a target appears both in a multi and in a single transformation:

        *.c Compile => *.o ;
        foo.c foo.h Compile -> foo.o ;

    Then the single transformation replaces the other. This allows specifics.

  * A `foreach` keyword expanding for each prerequisite, for example:

        foreach(foo.c bar.c) lib.h Compile -> foo.o bar.o foo.d bar.d

    would yield:

        foo.c lib.h Compile -> foo.o foo.d
        bar.c lib.h Compile -> bar.o bar.d

  * An `onlywith` keyword. This:

        *.c onlywith foo.c bar.c => *.o

    would only expand the fat arrow for the specified files.

  * An `except` keyword, the inverse of `onlywith`.

  * A `final` keyword, indicating that a globbing pattern expansion must not be
    propagated further. That would be useful to break dependency cycles. For
    example:

        *.coffee Coffee => *.js
        *.js GenCoffee => final *.gen.coffee

    In this case, no `*.gen.coffee` is not matched by the first rule, even if it
    exists on disk.

  * Implicit files:

        src/**/*.coffee
            Coffee => auto Concat -> dist/concat.js;

    The compiled JS files, in this case, are auto-named and placed in .mekano/.

  * Inside aliases:

        src/**/*.coffee :: sources
            Coffee => build/**/*.js

  * Includes:

        include util.mkno
