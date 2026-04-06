package com.algoflow.visualiser;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.*;

/**
 * Analyzes a node class to determine its structure: tree, linked list, or unknown.
 * Caches results per class.
 */
public class NodeStructure {

    public enum Kind { TREE, LINKED_LIST, UNKNOWN }

    private static final Map<Class<?>, NodeStructure> _cache = new HashMap<>();

    private final Class<?> nodeClass;
    private final Kind kind;
    private final List<Field> selfRefFields;
    private final List<Field> valueFields;
    // For linked lists: the "next" pointer (and optionally "prev")
    private final Field nextField;
    private final Field prevField;
    // For trees: left and right child pointers
    private final Field leftField;
    private final Field rightField;

    public static NodeStructure of(Class<?> clazz) {
        return _cache.computeIfAbsent(clazz, NodeStructure::new);
    }

    /** Quick check: does this class look like a node (has self-refs + value fields)? */
    public static boolean isNodeClass(Class<?> clazz) {
        if (!clazz.getPackageName().startsWith("com.algoflow.runner")) return false;
        return of(clazz).kind != Kind.UNKNOWN;
    }

    private NodeStructure(Class<?> clazz) {
        this.nodeClass = clazz;

        List<Field> selfRefs = new ArrayList<>();
        List<Field> values = new ArrayList<>();

        for (Field f : clazz.getDeclaredFields()) {
            if (Modifier.isStatic(f.getModifiers())) continue;
            if (f.getType() == clazz) {
                selfRefs.add(f);
            } else {
                values.add(f);
            }
        }

        this.selfRefFields = Collections.unmodifiableList(selfRefs);
        this.valueFields = Collections.unmodifiableList(values);

        if (selfRefs.isEmpty() || values.isEmpty()) {
            this.kind = Kind.UNKNOWN;
            this.nextField = null;
            this.prevField = null;
            this.leftField = null;
            this.rightField = null;
            return;
        }

        if (selfRefs.size() == 1) {
            // 1 self-ref → linked list
            this.kind = Kind.LINKED_LIST;
            this.nextField = selfRefs.get(0);
            this.prevField = null;
            this.leftField = null;
            this.rightField = null;
        } else if (selfRefs.size() == 2 && looksLikeTree(selfRefs)) {
            // 2 self-refs with tree-like names → tree
            this.kind = Kind.TREE;
            this.nextField = null;
            this.prevField = null;
            Field[] lr = resolveTreeFields(selfRefs);
            this.leftField = lr[0];
            this.rightField = lr[1];
        } else if (selfRefs.size() == 2) {
            // 2 self-refs but not tree-like names → doubly linked list
            this.kind = Kind.LINKED_LIST;
            Field[] np = resolveListFields(selfRefs);
            this.nextField = np[0];
            this.prevField = np[1];
            this.leftField = null;
            this.rightField = null;
        } else {
            // 3+ self-refs → try to find left/right among them → tree, else unknown
            Field[] lr = findTreeFieldsAmong(selfRefs);
            if (lr != null) {
                this.kind = Kind.TREE;
                this.leftField = lr[0];
                this.rightField = lr[1];
                this.nextField = null;
                this.prevField = null;
            } else {
                this.kind = Kind.UNKNOWN;
                this.nextField = null;
                this.prevField = null;
                this.leftField = null;
                this.rightField = null;
            }
        }
    }

    // ── Tree name detection ──────────────────────────────────────────────

    private static final Set<String> TREE_NAMES = Set.of(
            "left", "right", "child", "lchild", "rchild",
            "leftchild", "rightchild", "leftnode", "rightnode"
    );

    private static boolean looksLikeTree(List<Field> selfRefs) {
        int treeHits = 0;
        for (Field f : selfRefs) {
            if (TREE_NAMES.contains(f.getName().toLowerCase())) treeHits++;
        }
        return treeHits >= 1;
    }

    private static Field[] resolveTreeFields(List<Field> selfRefs) {
        // Try to identify left vs right by name; fall back to declaration order
        Field left = null, right = null;
        for (Field f : selfRefs) {
            String name = f.getName().toLowerCase();
            if (name.contains("left") || name.equals("l") || name.equals("lchild")) left = f;
            else if (name.contains("right") || name.equals("r") || name.equals("rchild")) right = f;
        }
        if (left == null) left = selfRefs.get(0);
        if (right == null) right = selfRefs.get(1);
        if (left == right) right = selfRefs.get(1); // safety
        return new Field[]{left, right};
    }

    private static Field[] findTreeFieldsAmong(List<Field> selfRefs) {
        // Among 3+ self-refs, find a left/right pair
        Field left = null, right = null;
        for (Field f : selfRefs) {
            String name = f.getName().toLowerCase();
            if (left == null && (name.contains("left") || name.equals("l") || name.equals("lchild"))) left = f;
            else if (right == null && (name.contains("right") || name.equals("r") || name.equals("rchild"))) right = f;
        }
        if (left != null && right != null) return new Field[]{left, right};
        return null;
    }

    // ── Linked list name detection ───────────────────────────────────────

    private static Field[] resolveListFields(List<Field> selfRefs) {
        // For doubly linked list: identify next vs prev
        Field next = null, prev = null;
        for (Field f : selfRefs) {
            String name = f.getName().toLowerCase();
            if (name.contains("prev") || name.equals("p") || name.contains("back")) prev = f;
            else if (name.contains("next") || name.equals("n") || name.contains("forward")) next = f;
        }
        // Fall back to declaration order: first = next, second = prev
        if (next == null) next = selfRefs.get(0);
        if (prev == null) prev = selfRefs.get(1);
        if (next == prev) prev = selfRefs.get(1);
        return new Field[]{next, prev};
    }

    // ── Accessors ────────────────────────────────────────────────────────

    public Class<?> getNodeClass() { return nodeClass; }
    public Kind getKind() { return kind; }
    public boolean isTree() { return kind == Kind.TREE; }
    public boolean isLinkedList() { return kind == Kind.LINKED_LIST; }
    public List<Field> getSelfRefFields() { return selfRefFields; }
    public List<Field> getValueFields() { return valueFields; }
    public Field getNextField() { return nextField; }
    public Field getPrevField() { return prevField; }
    public Field getLeftField() { return leftField; }
    public Field getRightField() { return rightField; }

    /** Returns the primary value field (first declared non-self-ref field). */
    public Field getPrimaryValueField() {
        return valueFields.isEmpty() ? null : valueFields.get(0);
    }

    public String getListTypeLabel() {
        if (kind != Kind.LINKED_LIST) return "LinkedList";
        return prevField != null ? "DoublyLinkedList" : "SinglyLinkedList";
    }

    // ── Field access helpers ─────────────────────────────────────────────

    public Object getFieldValue(Object node, Field field) {
        try {
            field.setAccessible(true);
            return field.get(node);
        } catch (Exception e) {
            return null;
        }
    }

    public Object getLeft(Object node) { return leftField != null ? getFieldValue(node, leftField) : null; }
    public Object getRight(Object node) { return rightField != null ? getFieldValue(node, rightField) : null; }
    public Object getNext(Object node) { return nextField != null ? getFieldValue(node, nextField) : null; }

    public double getPrimaryValueAsDouble(Object node) {
        Field f = getPrimaryValueField();
        if (f == null) return 0;
        Object val = getFieldValue(node, f);
        return val instanceof Number n ? n.doubleValue() : 0;
    }

    public Object getPrimaryValue(Object node) {
        Field f = getPrimaryValueField();
        return f != null ? getFieldValue(node, f) : null;
    }

    /** Returns a display string showing all value fields. */
    public String getDisplayValue(Object node) {
        if (valueFields.size() == 1) {
            Object val = getFieldValue(node, valueFields.get(0));
            return val != null ? val.toString() : "null";
        }
        StringBuilder sb = new StringBuilder();
        for (Field f : valueFields) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(f.getName()).append("=").append(getFieldValue(node, f));
        }
        return sb.toString();
    }
}
