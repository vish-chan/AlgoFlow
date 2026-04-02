import ast
import copy


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
    """

    def __init__(self):
        self._tracked_names = set()
        self._in_function = False

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
            stmts.extend(self._handle_call_expr(stmt))
        elif isinstance(stmt, ast.Delete):
            stmts.extend(self._handle_delete(stmt))
        elif isinstance(stmt, ast.For):
            stmts.extend(self._handle_for(stmt))
        elif isinstance(stmt, ast.While):
            stmt.body = self._process_body(stmt.body)
            if stmt.orelse:
                stmt.orelse = self._process_body(stmt.orelse)
            stmts.append(stmt)
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
        stmts = [node]
        for target in node.targets:
            if isinstance(target, ast.Name):
                self._tracked_names.add(target.id)
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
        return stmts

    def _handle_tuple_assign(self, target_tuple):
        """Handle tuple swap: arr[i], arr[j] = arr[j], arr[i]"""
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
            callbacks.append(
                ast.fix_missing_locations(ast.If(
                    test=ast.Call(
                        func=ast.Name(id="isinstance", ctx=ast.Load()),
                        args=[_load(obj), ast.Name(id="dict", ctx=ast.Load())],
                        keywords=[]
                    ),
                    body=[self._call_registry("on_dict_set", [_load(obj), _load(slc), _load(value_node)])],
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
        # Inject subscript read callbacks for the test expression
        stmts.extend(self._extract_subscript_reads(node.test))
        # Inject contains callbacks for `in` operator
        stmts.extend(self._extract_contains(node.test))
        node.body = self._process_body(node.body)
        if node.orelse:
            node.orelse = self._process_body(node.orelse)
        stmts.append(node)
        return stmts

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
            reset = self._call_registry("on_iter_start", [_load(node.iter)])
            injected_before = [reset]
            injected.append(self._call_registry("on_iter_next", [_load(node.iter)]))
        else:
            injected_before = []

        if injected:
            node.body = injected + node.body
        return injected_before + [node]

    def _is_range_call(self, node):
        return isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "range"

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
    tree = ast.parse(source)
    rewriter = Rewriter()
    new_tree = rewriter.visit(tree)
    ast.fix_missing_locations(new_tree)
    return new_tree
