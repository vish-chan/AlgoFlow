import ast
import copy
import re


def _parse_annotation(comment):
    """Parse # @graph, # @graph(directed=True), # @tree, # @chart, # @linkedlist."""
    m = re.match(r'@(graph|tree|chart|linkedlist)(?:\((.*)\))?', comment.strip())
    if not m:
        return None
    ann = {"type": m.group(1)}
    if m.group(2):
        for part in m.group(2).split(','):
            k, _, v = part.strip().partition('=')
            ann[k.strip()] = v.strip().lower() == 'true'
    return ann


def _extract_annotations(source):
    """Extract inline comment annotations from source lines. Returns {lineno: annotation_dict}."""
    annotations = {}
    for i, line in enumerate(source.splitlines(), 1):
        if '#' in line:
            comment = line[line.index('#') + 1:]
            ann = _parse_annotation(comment)
            if ann:
                annotations[i] = ann
    return annotations


class Rewriter(ast.NodeTransformer):
    """
    Rewrites user Python AST to inject visualization callbacks.

    Transforms:
    - Injects _r.highlight_line(N) before each user statement
    - Top-level assignments: register data structures
    - Subscript writes: arr[i] = v → original + callback
    - Tuple swap: arr[i], arr[j] = arr[j], arr[i] → original + callbacks per element
    - Subscript reads in comparisons: arr[j] → select event
    - Method calls: arr.append(x) → original + callback
    - print(): redirect to _r.on_print()
    - del dict[key]: inject callback
    - `in` operator: inject contains callback
    - For loop variable: inject on_local_update at body start
    - Local variable assignments in functions: inject on_local_update
    - Attribute set: obj.attr = val → original + _r.on_attr_set(obj, attr, val)
    - Attribute get: obj.attr → _r.on_attr_get(obj, attr) (in comparisons/reads)
    - Comment annotations: # @graph, # @tree, # @chart, # @linkedlist
    """

    def __init__(self, annotations=None):
        self._tracked_names = set()
        self._in_function = False
        self._annotations = annotations or {}

    def _highlight(self, lineno):
        """Build: _r.highlight_line(lineno)"""
        node = ast.Expr(value=ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="_r", ctx=ast.Load()),
                attr="highlight_line", ctx=ast.Load()
            ),
            args=[ast.Constant(value=lineno)],
            keywords=[]
        ))
        return ast.fix_missing_locations(node)

    def _call_registry(self, method, args):
        """Build: _r.method(args...)"""
        node = ast.Expr(value=ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="_r", ctx=ast.Load()),
                attr=method, ctx=ast.Load()
            ),
            args=args,
            keywords=[]
        ))
        return ast.fix_missing_locations(node)

    # ── Module: process body statements ──

    def visit_Module(self, node):
        node.body = self._process_body(node.body)
        return node

    def visit_FunctionDef(self, node):
        prev = self._in_function
        self._in_function = True
        node.body = self._process_body(node.body)
        self._in_function = prev
        return node

    def _process_body(self, stmts):
        new_body = []
        for stmt in stmts:
            result = self._transform_stmt(stmt)
            if isinstance(result, list):
                new_body.extend(result)
            else:
                new_body.append(result)
        return new_body

    def _transform_stmt(self, stmt):
        lineno = getattr(stmt, 'lineno', None)
        stmts = []

        if lineno:
            stmts.append(self._highlight(lineno))

        if isinstance(stmt, ast.Assign):
            stmts.extend(self._handle_assign(stmt))
        elif isinstance(stmt, ast.AugAssign):
            stmts.extend(self._handle_aug_assign(stmt))
        elif isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call):
            # Extract attr reads from call arguments before the call
            stmts.extend(self._extract_attr_reads_from_expr(stmt.value))
            stmts.extend(self._handle_call_expr(stmt))
        elif isinstance(stmt, ast.Delete):
            stmts.extend(self._handle_delete(stmt))
        elif isinstance(stmt, ast.For):
            stmts.extend(self._handle_for(stmt))
        elif isinstance(stmt, ast.While):
            stmts.extend(self._handle_while(stmt))
        elif isinstance(stmt, ast.If):
            stmts.extend(self._handle_if(stmt))
        elif isinstance(stmt, ast.FunctionDef):
            prev = self._in_function
            self._in_function = True
            stmt.body = self._process_body(stmt.body)
            self._in_function = prev
            stmts.append(stmt)
        elif isinstance(stmt, ast.Return):
            stmts.append(stmt)
        else:
            stmts.append(stmt)

        return stmts

    # ── Assignments ──

    def _handle_assign(self, node):
        stmts = []
        # Emit attr_get callbacks for attribute reads on the RHS before the assignment
        stmts.extend(self._extract_attr_reads_from_expr(node.value))
        # Emit subscript read callbacks for the RHS
        stmts.extend(self._extract_subscript_reads(node.value))
        stmts.append(node)
        for target in node.targets:
            if isinstance(target, ast.Name):
                self._tracked_names.add(target.id)
                # Emit annotation if present
                lineno = getattr(node, 'lineno', None)
                if lineno and lineno in self._annotations:
                    ann = self._annotations[lineno]
                    # Build annotation dict as AST Dict node
                    keys = [ast.Constant(value=k) for k in ann.keys()]
                    values = [ast.Constant(value=v) for v in ann.values()]
                    stmts.append(self._call_registry("set_annotation", [
                        ast.Constant(value=target.id),
                        ast.Dict(keys=keys, values=values)
                    ]))
                stmts.append(self._call_registry("register", [
                    ast.Constant(value=target.id),
                    ast.Name(id=target.id, ctx=ast.Load())
                ]))
                if self._in_function:
                    stmts.append(self._call_registry("on_local_update", [
                        ast.Constant(value=target.id),
                        ast.Name(id=target.id, ctx=ast.Load())
                    ]))
            elif isinstance(target, ast.Subscript):
                stmts.extend(self._subscript_set_callbacks(target, node.value))
            elif isinstance(target, ast.Tuple):
                stmts.extend(self._handle_tuple_assign(target))
            elif isinstance(target, ast.Attribute):
                stmts.extend(self._handle_attr_assign(target, node.value))
        return stmts

    def _extract_attr_reads_from_expr(self, node):
        """Extract attribute reads from any expression (assignments, returns, etc)."""
        callbacks = []
        attrs = []
        self._collect_attr_reads(node, attrs)
        for obj, attr_name in attrs:
            callbacks.append(self._call_registry("on_attr_get", [
                _load(obj), ast.Constant(value=attr_name)
            ]))
        return callbacks

    def _handle_attr_assign(self, target, value_node):
        """Handle obj.attr = value → emit on_attr_set callback."""
        return [self._call_registry("on_attr_set", [
            _load(target.value),
            ast.Constant(value=target.attr),
            _load(value_node)
        ])]

    def _handle_tuple_assign(self, target_tuple):
        """Handle tuple swap: arr[i], arr[j] = arr[j], arr[i] or node.left, node.right = ..."""
        callbacks = []
        for elt in target_tuple.elts:
            if isinstance(elt, ast.Subscript):
                obj = elt.value
                slc = elt.slice
                val = ast.Subscript(value=_load(obj), slice=_load(slc), ctx=ast.Load())
                if isinstance(obj, ast.Subscript):
                    outer = obj.value
                    row = obj.slice
                    col = slc
                    new_val = ast.Subscript(
                        value=ast.Subscript(value=_load(outer), slice=_load(row), ctx=ast.Load()),
                        slice=_load(col), ctx=ast.Load()
                    )
                    callbacks.append(self._call_registry("on_list2d_set", [
                        _load(outer), _load(row), _load(col), new_val
                    ]))
                else:
                    callbacks.append(ast.fix_missing_locations(ast.If(
                        test=ast.Call(
                            func=ast.Name(id="isinstance", ctx=ast.Load()),
                            args=[_load(obj), ast.Name(id="dict", ctx=ast.Load())],
                            keywords=[]
                        ),
                        body=[self._call_registry("on_dict_set", [_load(obj), _load(slc), val])],
                        orelse=[self._call_registry("on_list_set", [_load(obj), _load(slc), val])]
                    )))
            elif isinstance(elt, ast.Attribute):
                callbacks.append(self._call_registry("on_attr_set", [
                    _load(elt.value),
                    ast.Constant(value=elt.attr),
                    ast.Attribute(value=_load(elt.value), attr=elt.attr, ctx=ast.Load())
                ]))
            elif isinstance(elt, ast.Name) and self._in_function:
                callbacks.append(self._call_registry("on_local_update", [
                    ast.Constant(value=elt.id),
                    ast.Name(id=elt.id, ctx=ast.Load())
                ]))
        return callbacks

    def _subscript_set_callbacks(self, target, value_node):
        callbacks = []
        obj = target.value
        slc = target.slice

        if isinstance(obj, ast.Subscript):
            outer = obj.value
            row = obj.slice
            col = slc
            callbacks.append(self._call_registry("on_list2d_set", [
                _load(outer), _load(row), _load(col), _load(value_node)
            ]))
        else:
            # Check if this is a graph dict set: graph[node] = [neighbors]
            callbacks.append(
                ast.fix_missing_locations(ast.If(
                    test=ast.Call(
                        func=ast.Name(id="isinstance", ctx=ast.Load()),
                        args=[_load(obj), ast.Name(id="dict", ctx=ast.Load())],
                        keywords=[]
                    ),
                    body=[self._call_registry("on_graph_dict_set", [_load(obj), _load(slc), _load(value_node)])],
                    orelse=[self._call_registry("on_list_set", [_load(obj), _load(slc), _load(value_node)])]
                ))
            )
        return callbacks

    # ── Augmented assignment ──

    def _handle_aug_assign(self, node):
        stmts = [node]
        if isinstance(node.target, ast.Subscript):
            target = node.target
            obj = target.value
            slc = target.slice
            if isinstance(obj, ast.Subscript):
                outer = obj.value
                row = obj.slice
                col = slc
                new_val = ast.Subscript(
                    value=ast.Subscript(value=_load(outer), slice=_load(row), ctx=ast.Load()),
                    slice=_load(col), ctx=ast.Load()
                )
                stmts.append(self._call_registry("on_list2d_set", [
                    _load(outer), _load(row), _load(col), new_val
                ]))
            else:
                new_val = ast.Subscript(value=_load(obj), slice=_load(slc), ctx=ast.Load())
                stmts.append(ast.fix_missing_locations(ast.If(
                    test=ast.Call(
                        func=ast.Name(id="isinstance", ctx=ast.Load()),
                        args=[_load(obj), ast.Name(id="dict", ctx=ast.Load())],
                        keywords=[]
                    ),
                    body=[self._call_registry("on_dict_set", [_load(obj), _load(slc), new_val])],
                    orelse=[self._call_registry("on_list_set", [_load(obj), _load(slc), new_val])]
                )))
        elif isinstance(node.target, ast.Name) and self._in_function:
            stmts.append(self._call_registry("on_local_update", [
                ast.Constant(value=node.target.id),
                ast.Name(id=node.target.id, ctx=ast.Load())
            ]))
        return stmts

    # ── Call expressions ──

    def _handle_call_expr(self, node):
        call = node.value

        # print(...) → _r.on_print(...)
        if isinstance(call.func, ast.Name) and call.func.id == "print":
            return [ast.fix_missing_locations(ast.Expr(value=ast.Call(
                func=ast.Attribute(
                    value=ast.Name(id="_r", ctx=ast.Load()),
                    attr="on_print", ctx=ast.Load()
                ),
                args=call.args,
                keywords=call.keywords
            )))]

        # obj.method(...) → original + callback
        if isinstance(call.func, ast.Attribute):
            obj = call.func.value
            method = call.func.attr
            stmts = [node]

            if method in ("append", "insert", "extend"):
                # Check if this is a graph neighbor list append: graph[node].append(x)
                if isinstance(obj, ast.Subscript):
                    stmts.append(self._call_registry("on_graph_neighbor_append", [
                        _load(obj.value), _load(obj.slice)
                    ]))
                stmts.append(self._call_registry("on_list_append", [_load(obj)]))
                return stmts
            elif method in ("pop", "remove"):
                stmts.append(self._call_registry("on_list_remove", [_load(obj)]))
                return stmts
            elif method == "clear":
                stmts.append(ast.fix_missing_locations(ast.If(
                    test=ast.Call(
                        func=ast.Name(id="isinstance", ctx=ast.Load()),
                        args=[_load(obj), ast.Name(id="dict", ctx=ast.Load())],
                        keywords=[]
                    ),
                    body=[self._call_registry("on_dict_clear", [_load(obj)])],
                    orelse=[self._call_registry("on_list_clear", [_load(obj)])]
                )))
                return stmts
            elif method == "add":
                stmts.append(self._call_registry("on_set_add", [_load(obj)]))
                return stmts
            elif method == "discard":
                stmts.append(self._call_registry("on_set_remove", [_load(obj)]))
                return stmts

        return [node]

    # ── If statements — also inject contains + subscript read callbacks ──

    def _handle_if(self, node):
        stmts = []
        stmts.extend(self._extract_subscript_reads(node.test))
        stmts.extend(self._extract_attr_reads_from_expr(node.test))
        stmts.extend(self._extract_contains(node.test))
        node.body = self._process_body(node.body)
        if node.orelse:
            node.orelse = self._process_body(node.orelse)
        stmts.append(node)
        return stmts

    def _collect_attr_reads(self, node, out):
        """Recursively find Attribute nodes in Load context."""
        if isinstance(node, ast.Attribute) and isinstance(node.ctx, ast.Load):
            if node.attr in ('val', 'left', 'right', 'next', 'prev'):
                out.append((node.value, node.attr))
                return
        if isinstance(node, ast.Compare):
            self._collect_attr_reads(node.left, out)
            for comp in node.comparators:
                self._collect_attr_reads(comp, out)
        elif isinstance(node, ast.BoolOp):
            for val in node.values:
                self._collect_attr_reads(val, out)
        elif isinstance(node, ast.BinOp):
            self._collect_attr_reads(node.left, out)
            self._collect_attr_reads(node.right, out)
        elif isinstance(node, ast.Call):
            for arg in node.args:
                self._collect_attr_reads(arg, out)
        elif isinstance(node, ast.Tuple):
            for elt in node.elts:
                self._collect_attr_reads(elt, out)

    def _extract_subscript_reads(self, node):
        """Extract subscript reads from a comparison/expression and emit select callbacks."""
        callbacks = []
        subscripts = []
        self._collect_subscript_reads(node, subscripts)
        for obj, slc in subscripts:
            callbacks.append(ast.fix_missing_locations(ast.If(
                test=ast.Call(
                    func=ast.Name(id="isinstance", ctx=ast.Load()),
                    args=[_load(obj), ast.Name(id="dict", ctx=ast.Load())],
                    keywords=[]
                ),
                body=[self._call_registry("on_dict_get", [_load(obj), _load(slc)])],
                orelse=[self._call_registry("on_list_get", [_load(obj), _load(slc)])]
            )))
        return callbacks

    def _collect_subscript_reads(self, node, out):
        """Recursively find Subscript nodes in Load context."""
        if isinstance(node, ast.Subscript) and isinstance(node.ctx, ast.Load):
            obj = node.value
            # Skip nested subscripts (2D) — only collect if obj is a Name
            if isinstance(obj, ast.Name):
                out.append((obj, node.slice))
            elif isinstance(obj, ast.Subscript):
                # 2D read: obj[row][col]
                out.append((obj.value, obj.slice))  # outer read
                # We don't emit for inner — the 2D get handles it
        if isinstance(node, ast.Compare):
            self._collect_subscript_reads(node.left, out)
            for comp in node.comparators:
                self._collect_subscript_reads(comp, out)
        elif isinstance(node, ast.BoolOp):
            for val in node.values:
                self._collect_subscript_reads(val, out)
        elif isinstance(node, ast.BinOp):
            self._collect_subscript_reads(node.left, out)
            self._collect_subscript_reads(node.right, out)
        elif isinstance(node, ast.UnaryOp):
            self._collect_subscript_reads(node.operand, out)

    def _extract_contains(self, node):
        """Extract `x in collection` from Compare and emit contains callback."""
        callbacks = []
        if isinstance(node, ast.Compare):
            for op, comparator in zip(node.ops, node.comparators):
                if isinstance(op, (ast.In, ast.NotIn)):
                    callbacks.append(self._call_registry("on_contains", [
                        _load(comparator), _load(node.left)
                    ]))
        elif isinstance(node, ast.BoolOp):
            for val in node.values:
                callbacks.extend(self._extract_contains(val))
        return callbacks

    # ── For loops ──

    def _handle_for(self, node):
        node.body = self._process_body(node.body)
        if node.orelse:
            node.orelse = self._process_body(node.orelse)

        # Inject subscript read callback for the iterable (e.g. graph[node])
        injected_before = []
        injected_before.extend(self._extract_subscript_reads(node.iter))

        # Inject highlight for the for-line + local update for loop var at start of body
        loop_line = getattr(node, 'lineno', None)
        injected = []
        if loop_line:
            injected.append(self._highlight(loop_line))
        if isinstance(node.target, ast.Name) and self._in_function:
            injected.append(self._call_registry("on_local_update", [
                ast.Constant(value=node.target.id),
                ast.Name(id=node.target.id, ctx=ast.Load())
            ]))

        # Inject iteration tracking if iterating over a tracked collection (not range)
        if not self._is_range_call(node.iter):
            # Reset iteration index before the loop
            injected_before.append(self._call_registry("on_iter_start", [_load(node.iter)]))
            injected.append(self._call_registry("on_iter_next", [_load(node.iter)]))

        if injected:
            node.body = injected + node.body
        return injected_before + [node]

    def _is_range_call(self, node):
        return isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "range"

    # ── While loops ──

    def _handle_while(self, node):
        """Handle while loops — inject attr/subscript reads from the condition."""
        node.body = self._process_body(node.body)
        if node.orelse:
            node.orelse = self._process_body(node.orelse)

        # Inject attr reads and subscript reads from the while condition at the start of body
        condition_callbacks = []
        condition_callbacks.extend(self._extract_attr_reads_from_expr(node.test))
        condition_callbacks.extend(self._extract_subscript_reads(node.test))
        condition_callbacks.extend(self._extract_contains(node.test))

        loop_line = getattr(node, 'lineno', None)
        injected = []
        if loop_line:
            injected.append(self._highlight(loop_line))
        injected.extend(condition_callbacks)

        if injected:
            node.body = injected + node.body
        return [node]

    # ── Delete ──

    def _handle_delete(self, node):
        stmts = [node]
        for target in node.targets:
            if isinstance(target, ast.Subscript):
                stmts.append(self._call_registry("on_dict_delete", [
                    _load(target.value), _load(target.slice)
                ]))
        return stmts


def _load(node):
    """Deep copy an AST node and set Load context."""
    new = copy.deepcopy(node)
    if hasattr(new, 'ctx'):
        new.ctx = ast.Load()
    return new


def rewrite(source):
    """Parse and rewrite user source code."""
    annotations = _extract_annotations(source)
    tree = ast.parse(source)
    rewriter = Rewriter(annotations)
    new_tree = rewriter.visit(tree)
    ast.fix_missing_locations(new_tree)
    return new_tree
