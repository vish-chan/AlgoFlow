import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from algorithm_visualizer import Commander
from engine.registry import registry as _r
from engine.rewriter import rewrite


def trace_calls(frame, event, arg):
    """sys.settrace callback for function call/return tracking only."""
    if frame.f_code.co_filename != "<user>":
        return trace_calls

    if event == "call":
        name = frame.f_code.co_name
        if name != "<module>" and name != "__init__":
            varnames = frame.f_code.co_varnames
            nargs = frame.f_code.co_argcount
            args = [frame.f_locals[varnames[i]] for i in range(nargs) if varnames[i] in frame.f_locals]
            _r.on_call(name, args)
    elif event == "return":
        name = frame.f_code.co_name
        if name != "<module>" and name != "__init__":
            _r.on_return(name, arg)

    return trace_calls


def run(source):
    """Execute user source with visualization."""
    import sys
    sys.setrecursionlimit(max(sys.getrecursionlimit(), 10000))
    tree = rewrite(source)
    code = compile(tree, "<user>", "exec")

    user_globals = {"_r": _r, "__builtins__": __builtins__}

    sys.settrace(trace_calls)
    try:
        exec(code, user_globals)
    except Exception as e:
        raise
    finally:
        sys.settrace(None)

    return Commander.commands


def main():
    if len(sys.argv) < 2:
        print("Usage: python runner.py <file.py>", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1], "r") as f:
        source = f.read()

    try:
        commands = run(source)
        json.dump(commands, sys.stdout, separators=(",", ":"))
    except Exception as e:
        print(f"Exception in thread \"main\" {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
