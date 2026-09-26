# Third-party notices

AlgoFlow is licensed under Apache-2.0 (see [LICENSE](LICENSE)). It redistributes the
components below.

## Inside the Java engine artifact

`packages/java/engine` produces a shaded jar (`algo-transformer-*.jar`) that embeds its
dependencies. That jar is also **bundled into the VS Code extension's `.vsix`** as
`engine/algo-transformer.jar`, so anyone who installs the extension receives these:

| Component | Version | License | Package root in the jar |
|---|---|---|---|
| [tracers.java](https://github.com/algorithm-visualizer/tracers.java) | 2.3.5 | MIT | `org/algorithm_visualizer/` |
| [Byte Buddy](https://bytebuddy.net) (`byte-buddy`, `byte-buddy-agent`) | 1.18.4 | Apache-2.0 | `net/bytebuddy/` |
| [Gson](https://github.com/google/gson) | 2.8.5 | Apache-2.0 | `com/google/gson/` |

### tracers.java

The visualization tracers and the command protocol AlgoFlow records come from this library.

> The MIT License (MIT)
>
> Copyright (c) 2016 Jinseo Jason Park
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

### Byte Buddy and Gson

Both are licensed under the Apache License, Version 2.0, the same license as AlgoFlow;
its full text is in [LICENSE](LICENSE). Byte Buddy is copyright Rafael Winterhalter;
Gson is copyright Google Inc.

## Not redistributed, but derived from

`packages/python/engine/algorithm_visualizer/` is an independent Python implementation of
the same tracer API and wire protocol as
[tracers.py](https://github.com/algorithm-visualizer/tracers.py) (MIT, copyright Jinseo
Jason Park). No upstream code is copied, but the package name, class names and emitted
commands deliberately match so both engines produce interchangeable traces.

`packages/shared/visualizer` renders that protocol. It is AlgoFlow's own code, written
against the same command format.
