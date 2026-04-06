from collections import deque
from algorithm_visualizer import (
    Array1DTracer, Array2DTracer, GraphTracer, LogTracer, Tracer,
    VerticalLayout, Layout, CodeTracer, Commander
)


class _VisEntry:
    """Uniform wrapper for all registered visualizer entries."""
    __slots__ = ('kind', 'vis', 'ref', 'state')

    def __init__(self, kind, vis, ref, state=None):
        self.kind = kind
        self.vis = vis
        self.ref = ref
        self.state = state or {}


class Registry:
    def __init__(self):
        self._visualizers = []
        self._obj_to_vis = {}           # id(obj) -> _VisEntry
        self._code = None
        self._log = None
        self._call_stack = None
        self._locals_vis = None
        self._call_frames = []
        self._locals_frames = []
        self._line_offset = 0
        self._last_highlighted_line = -1
        self._iter_indices = {}
        self._neighbor_list_to_graph = {}
        self._trees = []
        self._linked_lists = []
        self._annotations = {}
        self._active_method_counts = {}  # method_name -> count (for recursive detection)

    # ── Helpers ──

    def _get(self, obj, *kinds):
        """Lookup entry by object id, optionally filtering by kind."""
        entry = self._obj_to_vis.get(id(obj))
        if entry and (not kinds or entry.kind in kinds):
            return entry
        return None

    def _add(self, kind, vis, obj, state=None):
        """Register a visualizer entry and update layout."""
        entry = _VisEntry(kind, vis, obj, state)
        self._visualizers.append(vis)
        self._obj_to_vis[id(obj)] = entry
        self.set_layout()
        return entry

    # ── Layout ──

    def set_layout(self):
        if self._log is None:
            self._log = LogTracer("Console")
        # CallStack and Locals always first, in that order
        ordered = []
        if self._call_stack:
            ordered.append(self._call_stack)
        if self._locals_vis:
            ordered.append(self._locals_vis)
        ordered.extend(v for v in self._visualizers
                       if v is not self._call_stack and v is not self._locals_vis)
        ordered.append(self._log)
        Layout.setRoot(VerticalLayout(ordered))

    # ── Code / Line Tracking ──

    def highlight_line(self, line_number):
        line = line_number - self._line_offset
        if line <= 0 or line == self._last_highlighted_line:
            return
        self._last_highlighted_line = line
        if self._code is None:
            self._code = CodeTracer("Line Tracker")
            self._visualizers.append(self._code)
            self.set_layout()
        self._code.highlight_line(line)
        Tracer.delay()

    # ── CallStack / Locals ──

    def on_call(self, name, args):
        if self._call_stack is None:
            self._call_stack = Array2DTracer("CallStack")
            self.set_layout()
        count = self._active_method_counts.get(name, 0)
        recursive = count > 0
        self._active_method_counts[name] = count + 1
        args_str = ", ".join(repr(a) for a in args) if args else ""
        label = f"{name}({args_str})"
        self._call_frames.append((label, recursive))
        self._update_call_stack()
        if self._locals_vis is None:
            self._locals_vis = Array2DTracer("Locals")
            self.set_layout()
        self._locals_frames.append({})
        self._update_locals()

    def on_return(self, name, result=None):
        if self._call_frames:
            # Show return value before popping (matches Java's CallStackVisualizer)
            if result is not None:
                label, recursive = self._call_frames[-1]
                self._call_frames[-1] = (f"{label} → {repr(result)}", recursive)
            self._update_call_stack(patch_top=True)
            self._call_frames.pop()
            count = self._active_method_counts.get(name, 1) - 1
            if count <= 0:
                self._active_method_counts.pop(name, None)
            else:
                self._active_method_counts[name] = count
            self._update_call_stack()
        if self._locals_frames:
            self._locals_frames.pop()
            self._update_locals()

    def _update_call_stack(self, patch_top=False):
        rows = [[label, "recursive" if recursive else ""]
                for label, recursive in self._call_frames]
        rows.reverse()
        self._call_stack.set(rows or [])
        if rows:
            if patch_top:
                self._call_stack.patch(0, 0)
            else:
                self._call_stack.select(0, 0)
        Tracer.delay()

    def _update_locals(self, patched_var=None):
        if not self._locals_frames:
            self._locals_vis.set([])
            return
        rows = []
        patched_row = -1
        row_idx = 0
        for i in range(len(self._call_frames) - 1, -1, -1):
            fname = self._call_frames[i][0] if i < len(self._call_frames) else "?"
            rows.append([f"▸ {fname}", ""])
            row_idx += 1
            if i < len(self._locals_frames):
                for k, v in self._locals_frames[i].items():
                    rows.append([f"  {k}", repr(v)])
                    if i == len(self._call_frames) - 1 and k == patched_var:
                        patched_row = row_idx
                    row_idx += 1
        self._locals_vis.set(rows)
        if patched_row >= 0:
            self._locals_vis.patch(patched_row, 1)
            Tracer.delay()
            self._locals_vis.depatch(patched_row, 1)
        else:
            Tracer.delay()

    def on_local_update(self, name, value):
        for lv in self._linked_lists:
            if lv.on_local_pointer(name, value):
                if self._locals_frames:
                    self._locals_frames[-1][name] = value
                    self._update_locals(patched_var=name)
                return
        if self._locals_frames:
            self._locals_frames[-1][name] = value
            self._update_locals(patched_var=name)

    # ── Annotations ──

    def set_annotation(self, name, annotation):
        self._annotations[name] = annotation

    # ── Registration ──

    def _register_simple(self, kind, label, obj, data):
        vis = Array1DTracer(label) if kind in ("list", "set") else Array2DTracer(label)
        vis.set(data)
        Tracer.delay()
        state = {"last_selected": -1} if kind == "list" else None
        self._add(kind, vis, obj, state)

    def register_chart(self, name, obj):
        from algorithm_visualizer import ChartTracer
        vis = ChartTracer(name)
        vis.set(list(obj))
        Tracer.delay()
        self._add("chart", vis, obj)

    def register_graph(self, name, obj, directed=False, weighted=False):
        vis = GraphTracer(f"graph: {name}")
        if directed:
            vis.directed(True)
        if weighted:
            vis.weighted(True)
        if isinstance(obj, dict):
            for node in obj:
                vis.addNode(node, node)
            for node, neighbors in obj.items():
                if isinstance(neighbors, list):
                    for n in neighbors:
                        if isinstance(n, (list, tuple)):
                            vis.addEdge(node, n[0], n[1])
                        else:
                            vis.addEdge(node, n)
            vis.layoutCircle()
        elif isinstance(obj, list) and obj and isinstance(obj[0], list):
            vis.set(obj)
        Tracer.delay()
        self._visualizers.append(vis)
        entry = _VisEntry("graph", vis, obj, {"last_source": None})
        self._obj_to_vis[id(obj)] = entry
        if isinstance(obj, list) and obj and isinstance(obj[0], list):
            for i, row in enumerate(obj):
                self._obj_to_vis[id(row)] = _VisEntry("graph_row", vis, obj, {"row_index": i})
        self.set_layout()

    def register(self, name, obj):
        if id(obj) in self._obj_to_vis:
            return

        ann = self._annotations.pop(name, None)

        if ann and ann.get("type") == "chart" and isinstance(obj, list):
            self.register_chart(name, obj)
            return
        if ann and ann.get("type") == "graph":
            self.register_graph(name, obj, ann.get("directed", False), ann.get("weighted", False))
            return
        if isinstance(obj, dict) and self._looks_like_graph(obj):
            self.register_graph(name, obj)
            return

        for lv in self._linked_lists:
            if lv.is_tracked_node(obj):
                lv.on_local_pointer(name, obj)
                return

        if isinstance(obj, list):
            if obj and isinstance(obj[0], list):
                self._register_simple("list2d", f"list2d: {name}", obj, [list(r) for r in obj])
            else:
                self._register_simple("list", f"list: {name}", obj, list(obj))
        elif isinstance(obj, set):
            self._register_simple("set", f"set: {name}", obj, list(obj))
        elif isinstance(obj, dict):
            keys = list(obj.keys())
            vis = Array2DTracer(f"dict: {name}")
            vis.set([keys, [obj[k] for k in keys]])
            Tracer.delay()
            self._add("dict", vis, obj)
        elif self._is_tree_node(obj):
            self._register_tree(name, obj)
        elif self._is_linked_list_node(obj):
            self._register_linked_list(name, obj)

    def _looks_like_graph(self, d):
        return bool(d) and all(isinstance(v, list) for v in d.values())

    # ── List operations ──

    def on_list_get(self, obj, index):
        e = self._get(obj)
        if not e:
            return
        if e.kind == "graph":
            # Outer read on adjacency matrix: matrix[row] — visit the row node
            self._graph_visit(e, index)
            return
        if e.kind == "graph_row":
            row_idx = e.state["row_index"]
            if isinstance(e.ref, list) and row_idx < len(e.ref) and index < len(e.ref[row_idx]):
                if e.ref[row_idx][index] != 0:
                    e.vis.visit(index, row_idx)
                    Tracer.delay()
            return
        if e.kind == "list":
            last = e.state.get("last_selected", -1)
            if last >= 0:
                e.vis.deselect(last)
            e.vis.select(index)
            Tracer.delay()
            e.state["last_selected"] = index

    def on_list_set(self, obj, index, value):
        e = self._get(obj)
        if not e:
            return
        if e.kind == "graph_row":
            row_idx = e.state["row_index"]
            if value != 0:
                e.vis.addEdge(row_idx, index, value)
            else:
                e.vis.removeEdge(row_idx, index)
            Tracer.delay()
        elif e.kind in ("list", "chart"):
            last = e.state.get("last_selected", -1)
            if last >= 0:
                e.vis.deselect(last)
            e.vis.patch(index, value)
            Tracer.delay()
            e.vis.depatch(index)
            e.state["last_selected"] = index

    def _refresh_list(self, obj):
        e = self._get(obj, "list")
        if e:
            e.vis.set(list(e.ref))
            Tracer.delay()

    def on_list_append(self, obj):
        self._refresh_list(obj)

    def on_list_remove(self, obj):
        self._refresh_list(obj)

    def on_list_clear(self, obj):
        e = self._get(obj)
        if e:
            e.vis.set(list(e.ref))
            Tracer.delay()

    def on_list_contains(self, obj, element):
        e = self._get(obj, "list")
        if not e:
            return
        for i, el in enumerate(e.ref):
            if el == element:
                e.vis.select(i)
                Tracer.delay()
                e.vis.deselect(i)
                return
        Tracer.delay()

    # ── 2D List operations ──

    def on_list2d_get(self, obj, row, col):
        e = self._get(obj)
        if not e:
            return
        e.vis.select(row, col)
        Tracer.delay()
        e.vis.deselect(row, col)

    def on_list2d_set(self, obj, row, col, value):
        e = self._get(obj)
        if not e:
            return
        e.vis.patch(row, col, value)
        Tracer.delay()
        e.vis.depatch(row, col)

    # ── Set operations ──

    def _refresh_set(self, obj):
        e = self._get(obj, "set")
        if e:
            e.vis.set(list(e.ref))
            Tracer.delay()

    def on_set_add(self, obj):
        self._refresh_set(obj)

    def on_set_remove(self, obj):
        self._refresh_set(obj)

    def on_set_clear(self, obj):
        self._refresh_set(obj)

    def on_set_contains(self, obj, element):
        e = self._get(obj, "set")
        if not e:
            return
        for i, el in enumerate(e.ref):
            if el == element:
                e.vis.select(i)
                Tracer.delay()
                e.vis.deselect(i)
                return
        Tracer.delay()

    # ── Dict operations ──

    def _dict_key_index(self, obj, key):
        for i, k in enumerate(obj.keys()):
            if k == key:
                return i
        return -1

    def _dict_refresh(self, e):
        keys = list(e.ref.keys())
        e.vis.set([keys, [e.ref[k] for k in keys]])

    def on_dict_set(self, obj, key, value):
        e = self._get(obj, "dict")
        if not e:
            return
        self._dict_refresh(e)
        col = self._dict_key_index(e.ref, key)
        if col >= 0:
            e.vis.select(0, col)
            e.vis.select(1, col)
            Tracer.delay()
            e.vis.deselect(0, col)
            e.vis.deselect(1, col)
        Tracer.delay()

    def on_dict_get(self, obj, key):
        e = self._get(obj)
        if not e:
            return
        if e.kind == "graph":
            self._graph_visit(e, key)
            if isinstance(e.ref, dict) and key in e.ref:
                self._neighbor_list_to_graph[id(e.ref[key])] = (e, key)
            return
        if e.kind != "dict":
            return
        col = self._dict_key_index(e.ref, key)
        if col >= 0:
            e.vis.select(0, col)
            e.vis.select(1, col)
            Tracer.delay()
            e.vis.deselect(0, col)
            e.vis.deselect(1, col)
        Tracer.delay()

    def on_dict_delete(self, obj, key):
        e = self._get(obj, "dict")
        if e:
            self._dict_refresh(e)
            Tracer.delay()

    def on_dict_clear(self, obj):
        e = self._get(obj, "dict")
        if e:
            self._dict_refresh(e)
            Tracer.delay()

    def on_dict_contains(self, obj, key):
        self.on_dict_get(obj, key)

    # ── Graph operations ──

    def _graph_visit(self, e, node, source=None):
        last = e.state.get("last_source")
        if last is not None and last != node:
            e.vis.leave(last)
            Tracer.delay()
        e.state["last_source"] = node
        if source is not None:
            e.vis.visit(node, source)
        else:
            e.vis.visit(node)
        Tracer.delay()

    def on_graph_visit(self, obj, node, source=None):
        e = self._get(obj, "graph")
        if e:
            self._graph_visit(e, node, source)

    def on_graph_leave(self, obj, node):
        e = self._get(obj, "graph")
        if not e:
            return
        e.vis.leave(node)
        Tracer.delay()
        if e.state.get("last_source") == node:
            e.state["last_source"] = None

    def on_graph_add_edge(self, obj, source, target, weight=None):
        e = self._get(obj, "graph")
        if not e:
            return
        if weight is not None:
            e.vis.addEdge(source, target, weight)
        else:
            e.vis.addEdge(source, target)
        Tracer.delay()

    def on_graph_remove_edge(self, obj, source, target):
        e = self._get(obj, "graph")
        if e:
            e.vis.removeEdge(source, target)
            Tracer.delay()

    def on_graph_add_node(self, obj, node):
        e = self._get(obj, "graph")
        if e:
            e.vis.addNode(node, node)
            e.vis.layoutCircle()
            Tracer.delay()

    def on_graph_dict_set(self, obj, key, value):
        e = self._get(obj, "graph")
        if not e:
            self.on_dict_set(obj, key, value)
            return
        e.vis.addNode(key, key)
        if isinstance(value, list):
            for n in value:
                if isinstance(n, (list, tuple)):
                    e.vis.addEdge(key, n[0], n[1])
                else:
                    e.vis.addEdge(key, n)
        e.vis.layoutCircle()
        Tracer.delay()

    def on_graph_neighbor_append(self, obj, node):
        e = self._get(obj, "graph")
        if not e:
            return
        if isinstance(e.ref, dict) and node in e.ref:
            neighbors = e.ref[node]
            if neighbors:
                e.vis.addEdge(node, neighbors[-1])
                e.vis.visit(neighbors[-1], node)
                Tracer.delay()
                e.vis.layoutCircle()
                Tracer.delay()

    # ── Tree operations ──

    def _is_tree_node(self, obj):
        return (hasattr(obj, 'left') or hasattr(obj, 'right')) and hasattr(obj, 'val')

    def _register_tree(self, name, root):
        tv = _TreeVis(name, root)
        self._trees.append(tv)
        self._visualizers.append(tv.tracer)
        self.set_layout()

    def on_attr_set(self, obj, attr_name, value):
        for tv in self._trees:
            if tv.on_field_set(obj, attr_name):
                return
        for lv in self._linked_lists:
            if lv.on_field_set(obj, attr_name):
                return

    def on_attr_get(self, obj, attr_name):
        for tv in self._trees:
            if tv.on_field_get(obj, attr_name):
                return
        for lv in self._linked_lists:
            if lv.on_field_get(obj, attr_name):
                return

    # ── Linked list operations ──

    def _is_linked_list_node(self, obj):
        return hasattr(obj, 'next') and hasattr(obj, 'val') and not hasattr(obj, 'left')

    def _register_linked_list(self, name, head):
        lv = _LinkedListVis(name, head)
        self._linked_lists.append(lv)
        self._visualizers.append(lv.tracer)
        self.set_layout()

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
        Tracer.delay()

    # ── Contains ──

    def on_contains(self, obj, element):
        e = self._get(obj)
        if not e:
            return
        dispatch = {"list": self.on_list_contains, "set": self.on_set_contains, "dict": self.on_dict_contains}
        handler = dispatch.get(e.kind)
        if handler:
            handler(obj, element)

    # ── Iterator tracking ──

    def on_iter_start(self, obj):
        self._iter_indices[id(obj)] = 0

    def on_iter_next(self, obj):
        iter_key = id(obj)
        idx = self._iter_indices.get(iter_key, 0)

        graph_info = self._neighbor_list_to_graph.get(id(obj))
        if graph_info:
            graph_entry, parent_node = graph_info
            neighbors = list(obj) if not isinstance(obj, list) else obj
            if idx < len(neighbors):
                self._graph_visit(graph_entry, neighbors[idx], parent_node)
            self._iter_indices[iter_key] = idx + 1
            return

        e = self._get(obj)
        if not e:
            self._iter_indices[iter_key] = idx + 1
            return

        if e.kind == "graph":
            keys = list(e.ref.keys()) if isinstance(e.ref, dict) else []
            if idx < len(keys):
                self._graph_visit(e, keys[idx])
        elif e.kind in ("list", "set"):
            if idx < len(e.ref):
                e.vis.select(idx)
                Tracer.delay()
                e.vis.deselect(idx)
        elif e.kind == "dict":
            keys = list(e.ref.keys())
            if idx < len(keys):
                e.vis.select(0, idx)
                e.vis.select(1, idx)
                Tracer.delay()
                e.vis.deselect(0, idx)
                e.vis.deselect(1, idx)

        self._iter_indices[iter_key] = idx + 1


# Global singleton
registry = Registry()


# ── Tree visualizer helper ──

class _TreeVis:
    def __init__(self, name, root):
        self.tracer = GraphTracer(f"tree: {name}")
        self.tracer.directed(True)
        self._known = set()
        self._root = root
        self._null_counter = 0
        self._last_visited = None
        self._rebuild()

    def _rebuild(self):
        self._known.clear()
        self._null_counter = 0
        self.tracer.reset()
        self.tracer.directed(True)
        if self._root is not None:
            self._walk(self._root)
            self.tracer.layoutTree(id(self._root))
        Tracer.delay()

    def _walk(self, node):
        q = deque([node])
        self._known.add(id(node))
        self.tracer.addNode(id(node), getattr(node, 'val', 0))
        while q:
            n = q.popleft()
            for attr in ('left', 'right'):
                child = getattr(n, attr, None)
                if child is not None:
                    if id(child) not in self._known:
                        self._known.add(id(child))
                        self.tracer.addNode(id(child), getattr(child, 'val', 0))
                        q.append(child)
                    self.tracer.addEdge(id(n), id(child))
                else:
                    null_id = f"null_{self._null_counter}"
                    self._null_counter += 1
                    self.tracer.addNode(null_id)
                    self.tracer.addEdge(id(n), null_id)

    def _leave_last(self, new_id):
        if self._last_visited is not None and self._last_visited != new_id:
            self.tracer.leave(self._last_visited)
            Tracer.delay()

    def on_field_set(self, owner, field_name):
        if id(owner) not in self._known:
            return False
        if field_name == 'val':
            self.tracer.updateNode(id(owner), getattr(owner, 'val', 0))
            Tracer.delay()
            return True
        if field_name in ('left', 'right'):
            self._rebuild()
            return True
        return False

    def on_field_get(self, owner, field_name):
        if id(owner) not in self._known:
            return False
        if field_name in ('left', 'right'):
            child = getattr(owner, field_name, None)
            if child is not None and id(child) in self._known:
                self._leave_last(id(child))
                self._last_visited = id(child)
                self.tracer.visit(id(child), id(owner))
                Tracer.delay()
            return True
        if field_name == 'val':
            self._leave_last(id(owner))
            self._last_visited = id(owner)
            self.tracer.visit(id(owner))
            Tracer.delay()
            return True
        return False


# ── Linked list visualizer helper ──

class _LinkedListVis:
    def __init__(self, name, head):
        label = "DoublyLinkedList" if hasattr(head, 'prev') else "SinglyLinkedList"
        self.tracer = Array1DTracer(f"{label}: {name}")
        self._head = head
        self._ordered = []
        self._id_to_node = {}
        self._known_ids = set()
        self._pointer_names = {}
        self._last_selected = -1
        self._rebuild()

    def _rebuild(self):
        self._ordered.clear()
        self._id_to_node.clear()
        node = self._head
        seen = set()
        while node is not None and id(node) not in seen:
            seen.add(id(node))
            self._ordered.append(id(node))
            self._id_to_node[id(node)] = node
            node = getattr(node, 'next', None)
        self._known_ids = set(self._ordered)
        self.tracer.set([getattr(self._id_to_node[nid], 'val', None) for nid in self._ordered])
        Tracer.delay()

    def _index_of(self, node):
        nid = id(node)
        for i, oid in enumerate(self._ordered):
            if oid == nid:
                return i
        return -1

    def is_tracked_node(self, obj):
        return id(obj) in self._known_ids

    def _select(self, idx):
        if self._last_selected >= 0:
            self.tracer.deselect(self._last_selected)
        self.tracer.select(idx)
        Tracer.delay()
        self._last_selected = idx

    def on_local_pointer(self, var_name, value):
        if value is not None and id(value) in self._known_ids:
            self._pointer_names[var_name] = id(value)
            idx = self._index_of(value)
            if idx >= 0:
                self._select(idx)
            return True
        if var_name in self._pointer_names:
            if self._last_selected >= 0:
                self.tracer.deselect(self._last_selected)
                self._last_selected = -1
            del self._pointer_names[var_name]
            return True
        return False

    def on_field_set(self, owner, field_name):
        if id(owner) not in self._known_ids:
            return False
        if field_name in ('next', 'val'):
            self._head = self._id_to_node.get(self._ordered[0]) if self._ordered else None
            self._rebuild()
            return True
        return False

    def on_field_get(self, owner, field_name):
        if id(owner) not in self._known_ids:
            return False
        if field_name == 'next':
            nxt = getattr(owner, 'next', None)
            if nxt is not None:
                idx = self._index_of(nxt)
                if idx >= 0:
                    self._select(idx)
            return True
        if field_name == 'val':
            idx = self._index_of(owner)
            if idx >= 0:
                self.tracer.select(idx)
                Tracer.delay()
                self.tracer.deselect(idx)
            return True
        return False
