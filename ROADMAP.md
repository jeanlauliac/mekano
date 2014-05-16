Roadmap
=======

Fancy features to add:

  * a `foreach` keyword expanding for each prerequisite, for example:

        foreach(foo.c bar.c) lib.h -> foo.o bar.o foo.d bar.d

    would yield:

        foo.c lib.h -> foo.o foo.d
        bar.c lib.h -> bar.o bar.d

  * a `onlywith` keyword. This:

        *.c onlywith foo.c bar.c => *.o

    would only expand the fat arrow for the specified files.

  * an `except` keyword, the inverse of `with`.

  * Using interpolation in path lists (targets or prerequisites).
