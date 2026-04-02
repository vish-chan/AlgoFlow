import sys
from algorithm_visualizer import (
    Array1DTracer, Array2DTracer, LogTracer, Tracer,
    VerticalLayout, Layout, CodeTracer, Commander
)


class Registry:
    def __init__(self):
        self._visualizers = []          # Commander instances for layout
        self._obj_to_vis = {}           # id(obj) -> visualizer
        self._code = None               # CodeTracer
        self._log = None                # LogTracer
        self._call_stack = None         # Array2DTracer
        self._locals_vis = None         # Array2DTracer
        self._call_frames = []          # stack of (name, args)
        self._locals_frames = []        # stack of {name: value}
        self._line_offset = 0           # offset to map rewritten lines back to user lines
        self._iter_indices = {}         # id(obj) -> current iteration index

    # ── Layout ──

    def set_layout(self):
        if self._log is None:
            self._log = LogTracer("Console")
        all_cmds = self._visualizers + [self._log]
        Layout.setRoot(VerticalLayout(all_cmds))

    # ── Code / Line Tracking ──

    def _ensure_code(self):
        if self._code is None:
            self._code = CodeTracer("Line Tracker")
            self._visualizers.append(self._code)
            self.set_layout()

    def highlight_line(self, line_number):
        line = line_number - self._line_offset
        if line <= 0:
            return
        self._ensure_code()
        self._code.highlight_line(line)
        Tracer.delay()

    # ── CallStack ──

    def _ensure_call_stack(self):
        if self._call_stack is None:
            self._call_stack = Array2DTracer("CallStack")
            self._visualizers.insert(0, self._call_stack)
            self.set_layout()

    def _ensure_locals(self):
        if self._locals_vis is None:
            self._locals_vis = Array2DTracer("Locals")
            idx = 1 if self._call_stack else 0
            self._visualizers.insert(idx, self._locals_vis)
            self.set_layout()

    def on_call(self, name, args):
        self._ensure_call_stack()
        self._call_frames.append((name, args))
        self._update_call_stack()
        self._ensure_locals()
        self._locals_frames.append({})
        self._update_locals()

    def on_return(self, name):
        if self._call_frames:
            self._call_frames.pop()
            self._update_call_stack()
        if self._locals_frames:
            self._locals_frames.pop()
            self._update_locals()

    def _update_call_stack(self):
        rows = []
        for name, args in self._call_frames:
            args_str = ", ".join(repr(a) for a in args) if args else ""
            rows.append([f"{name}({args_str})", ""])
        rows.reverse()
        self._call_stack.set(rows if rows else [])
        if rows:
            self._call_stack.select(0, 0)
        Tracer.delay()

    def _update_locals(self):
        if not self._locals_frames:
            self._locals_vis.set([])
            return
        # Build rows for all frames, newest first (matching Java engine format)
        rows = []
        for i in range(len(self._call_frames) - 1, -1, -1):
            fname = self._call_frames[i][0] if i < len(self._call_frames) else "?"
            rows.append([f"▸ {fname}", ""])
            if i < len(self._locals_frames):
                for k, v in self._locals_frames[i].items():
                    rows.append([f"  {k}", repr(v)])
        self._locals_vis.set(rows)
        Tracer.delay()

    def on_local_update(self, name, value):
        if self._locals_frames:
            self._locals_frames[-1][name] = value
            self._update_locals()

    # ── Registration ──

    def register_list(self, name, obj):
        vis = Array1DTracer(f"list: {name}")
        vis.set(list(obj))
        Tracer.delay()
        self._visualizers.append(vis)
        self._obj_to_vis[id(obj)] = ("list", vis, obj)
        self.set_layout()

    def register_set(self, name, obj):
        vis = Array1DTracer(f"set: {name}")
        vis.set(list(obj))
        Tracer.delay()
        self._visualizers.append(vis)
        self._obj_to_vis[id(obj)] = ("set", vis, obj)
        self.set_layout()

    def register_dict(self, name, obj):
        vis = Array2DTracer(f"dict: {name}")
        keys = list(obj.keys())
        vals = [obj[k] for k in keys]
        vis.set([keys, vals])
        Tracer.delay()
        self._visualizers.append(vis)
        self._obj_to_vis[id(obj)] = ("dict", vis, obj)
        self.set_layout()

    def register_2d_list(self, name, obj):
        vis = Array2DTracer(f"list2d: {name}")
        vis.set([list(row) for row in obj])
        Tracer.delay()
        self._visualizers.append(vis)
        self._obj_to_vis[id(obj)] = ("list2d", vis, obj)
        self.set_layout()

    def register(self, name, obj):
        if id(obj) in self._obj_to_vis:
            return
        if isinstance(obj, list):
            if obj and isinstance(obj[0], list):
                self.register_2d_list(name, obj)
            else:
                self.register_list(name, obj)
        elif isinstance(obj, set):
            self.register_set(name, obj)
        elif isinstance(obj, dict):
            self.register_dict(name, obj)

    # ── List operations ──

    def on_list_get(self, obj, index):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        kind, vis, _ = entry
        if kind == "list":
            vis.select(index)
            Tracer.delay()
            vis.deselect(index)

    def on_list_set(self, obj, index, value):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        kind, vis, ref = entry
        if kind == "list":
            vis.patch(index, value)
            Tracer.delay()
            vis.depatch(index)
        elif kind == "list2d":
            # handled by on_list2d_set
            pass

    def on_list_append(self, obj):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        kind, vis, ref = entry
        if kind == "list":
            vis.set(list(ref))
            Tracer.delay()

    def on_list_remove(self, obj):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        kind, vis, ref = entry
        if kind == "list":
            vis.set(list(ref))
            Tracer.delay()

    def on_list_clear(self, obj):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        kind, vis, ref = entry
        vis.set(list(ref))
        Tracer.delay()

    def on_list_contains(self, obj, element):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        kind, vis, ref = entry
        if kind == "list":
            for i, e in enumerate(ref):
                if e == element:
                    vis.select(i)
                    Tracer.delay()
                    vis.deselect(i)
                    return
            Tracer.delay()

    # ── 2D List operations ──

    def on_list2d_get(self, obj, row, col):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        _, vis, _ = entry
        vis.select(row, col)
        Tracer.delay()
        vis.deselect(row, col)

    def on_list2d_set(self, obj, row, col, value):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        _, vis, _ = entry
        vis.patch(row, col, value)
        Tracer.delay()
        vis.depatch(row, col)

    # ── Set operations ──

    def on_set_add(self, obj):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        _, vis, ref = entry
        vis.set(list(ref))
        Tracer.delay()

    def on_set_remove(self, obj):
        self.on_set_add(obj)  # same — refresh display

    def on_set_clear(self, obj):
        self.on_set_add(obj)

    def on_set_contains(self, obj, element):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        _, vis, ref = entry
        for i, e in enumerate(ref):
            if e == element:
                vis.select(i)
                Tracer.delay()
                vis.deselect(i)
                return
        Tracer.delay()

    # ── Dict operations ──

    def _dict_key_index(self, obj, key):
        for i, k in enumerate(obj.keys()):
            if k == key:
                return i
        return -1

    def _dict_update_display(self, vis, obj):
        keys = list(obj.keys())
        vals = [obj[k] for k in keys]
        vis.set([keys, vals])

    def on_dict_set(self, obj, key, value):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        _, vis, ref = entry
        self._dict_update_display(vis, ref)
        col = self._dict_key_index(ref, key)
        if col >= 0:
            vis.select(0, col)
            vis.select(1, col)
            Tracer.delay()
            vis.deselect(0, col)
            vis.deselect(1, col)
        Tracer.delay()

    def on_dict_get(self, obj, key):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        _, vis, ref = entry
        col = self._dict_key_index(ref, key)
        if col >= 0:
            vis.select(0, col)
            vis.select(1, col)
            Tracer.delay()
            vis.deselect(0, col)
            vis.deselect(1, col)
            Tracer.delay()
        else:
            Tracer.delay()

    def on_dict_delete(self, obj, key):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        _, vis, ref = entry
        self._dict_update_display(vis, ref)
        Tracer.delay()

    def on_dict_clear(self, obj):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        _, vis, ref = entry
        self._dict_update_display(vis, ref)
        Tracer.delay()

    def on_dict_contains(self, obj, key):
        self.on_dict_get(obj, key)

    # ── Console ──

    def on_print(self, *args, **kwargs):
        if self._log is None:
            self._log = LogTracer("Console")
            self.set_layout()
        text = " ".join(str(a) for a in args)
        end = kwargs.get("end", "\n")
        if end == "\n":
            self._log.println(text)
        else:
            self._log.print(text + end)

    # ── Contains (in operator) ──

    def on_contains(self, obj, element):
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        kind = entry[0]
        if kind == "list":
            self.on_list_contains(obj, element)
        elif kind == "set":
            self.on_set_contains(obj, element)
        elif kind == "dict":
            self.on_dict_contains(obj, element)

    # ── Iterator tracking ──

    def on_iter_start(self, obj):
        """Reset iteration index for a collection."""
        self._iter_indices[id(obj)] = 0

    def on_iter_next(self, obj):
        """Called each iteration when iterating over a tracked collection."""
        entry = self._obj_to_vis.get(id(obj))
        if not entry:
            return
        kind, vis, ref = entry
        iter_key = id(obj)
        idx = self._iter_indices.get(iter_key, 0)

        if kind in ("list", "set"):
            if idx < len(ref):
                vis.select(idx)
                Tracer.delay()
                vis.deselect(idx)
        elif kind == "dict":
            keys = list(ref.keys())
            if idx < len(keys):
                vis.select(0, idx)
                vis.select(1, idx)
                Tracer.delay()
                vis.deselect(0, idx)
                vis.deselect(1, idx)

        self._iter_indices[iter_key] = idx + 1


# Global singleton
registry = Registry()
