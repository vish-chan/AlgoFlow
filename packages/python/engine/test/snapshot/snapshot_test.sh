#!/usr/bin/env bash
#
# Snapshot test runner for the AlgoFlow Python engine.
#
# Usage:
#   ./snapshot_test.sh generate   — run all examples, save output as golden snapshots
#   ./snapshot_test.sh verify     — run all examples, compare against golden snapshots
#   ./snapshot_test.sh run <slug> — run a single example and print its output
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENGINE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLES_DIR="$SCRIPT_DIR/examples"
SNAPSHOTS_DIR="$SCRIPT_DIR/snapshots"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Normalize visualization JSON for stable comparison:
# - Strip random tracer keys (8-char alphanumeric) and replace with positional placeholders
# - Strip Python object ids (0x...) from repr strings
normalize_json() {
    python3 - "$1" << 'PYEOF'
import json, sys, re

with open(sys.argv[1]) as f:
    commands = json.load(f)

KEY_PATTERN = re.compile(r'^[a-z0-9]{8}$')

# Collect tracer keys
raw_keys = set()
for cmd in commands:
    k = cmd.get("key")
    if k and KEY_PATTERN.match(k):
        raw_keys.add(k)

# Assign stable names in order of first appearance
key_map = {}
counter = 0
for cmd in commands:
    k = cmd.get("key")
    if k in raw_keys and k not in key_map:
        key_map[k] = f"tracer_{counter:03d}"
        counter += 1

# Normalize Python object ids used as node IDs (large ints from id())
NODE_ID_METHODS = {'addNode', 'addEdge', 'visit', 'leave', 'select', 'deselect',
                   'layoutTree', 'removeNode', 'removeEdge', 'updateNode'}
node_id_map = {}
node_counter = 0

def stable_node_id(v):
    global node_counter
    if isinstance(v, int) and v > 100000:
        if v not in node_id_map:
            node_id_map[v] = f"node_{node_counter:03d}"
            node_counter += 1
        return node_id_map[v]
    if isinstance(v, str) and re.match(r'^\d{6,}$', v):
        iv = int(v)
        if iv not in node_id_map:
            node_id_map[iv] = f"node_{node_counter:03d}"
            node_counter += 1
        return node_id_map[iv]
    return v

def replace_val(v):
    if isinstance(v, str):
        if v in key_map:
            return key_map[v]
        # Scrub Python object addresses like <TreeNode object at 0x...>
        v = re.sub(r' at 0x[0-9a-f]+', ' at 0xHASH', v)
        # Scrub Python object ids in repr
        v = re.sub(r'object at 0x[0-9a-f]+', 'object at 0xHASH', v)
        return v
    if isinstance(v, list):
        return [replace_val(item) for item in v]
    return v

def replace_val_with_nodes(v):
    if isinstance(v, str):
        if v in key_map:
            return key_map[v]
        v = re.sub(r' at 0x[0-9a-f]+', ' at 0xHASH', v)
        return stable_node_id(v)
    if isinstance(v, int):
        return stable_node_id(v)
    if isinstance(v, list):
        return [replace_val_with_nodes(item) for item in v]
    return v

normalized = []
for cmd in commands:
    method = cmd.get("method", "")
    args = cmd.get("args", [])
    new_args = []
    for a in args:
        if method in NODE_ID_METHODS:
            new_args.append(replace_val_with_nodes(a))
        else:
            new_args.append(replace_val(a))
    normalized.append({
        "key": key_map.get(cmd.get("key"), cmd.get("key")),
        "method": method,
        "args": new_args
    })

print(json.dumps(normalized, indent=2, sort_keys=False))
PYEOF
}

run_example() {
    local slug="$1"
    local py_file="$EXAMPLES_DIR/${slug}.py"
    local tmp_output
    tmp_output=$(mktemp)

    if ! python3 "$ENGINE_DIR/engine/runner.py" "$py_file" > "$tmp_output" 2>/dev/null; then
        echo -e "${RED}RUNTIME FAIL${NC}: $slug"
        rm -f "$tmp_output"
        return 1
    fi

    if [[ ! -s "$tmp_output" ]]; then
        echo -e "${RED}NO OUTPUT${NC}: $slug"
        rm -f "$tmp_output"
        return 1
    fi

    normalize_json "$tmp_output"
    rm -f "$tmp_output"
}

cmd_generate() {
    mkdir -p "$SNAPSHOTS_DIR"
    local total=0 pass=0 fail=0

    while IFS= read -r slug; do
        total=$((total + 1))
        echo -n "  Generating: $slug ... "
        if output=$(run_example "$slug" 2>&1); then
            echo "$output" > "$SNAPSHOTS_DIR/${slug}.json"
            echo -e "${GREEN}OK${NC}"
            pass=$((pass + 1))
        else
            echo -e "${RED}FAIL${NC}"
            echo "$output" >&2
            fail=$((fail + 1))
        fi
    done < "$EXAMPLES_DIR/manifest.txt"

    echo ""
    echo -e "Generated: ${GREEN}$pass${NC}/$total passed, ${RED}$fail${NC} failed"
    echo "Snapshots saved to: $SNAPSHOTS_DIR/"
}

cmd_verify() {
    if [[ ! -d "$SNAPSHOTS_DIR" ]]; then
        echo -e "${RED}No snapshots found. Run './snapshot_test.sh generate' first.${NC}"
        exit 1
    fi

    local total=0 pass=0 fail=0 missing=0

    while IFS= read -r slug; do
        total=$((total + 1))
        local snapshot="$SNAPSHOTS_DIR/${slug}.json"

        if [[ ! -f "$snapshot" ]]; then
            echo -e "  ${YELLOW}SKIP${NC}: $slug (no snapshot)"
            missing=$((missing + 1))
            continue
        fi

        echo -n "  Verifying: $slug ... "
        if actual=$(run_example "$slug" 2>&1); then
            if diff <(echo "$actual") "$snapshot" > /dev/null 2>&1; then
                echo -e "${GREEN}PASS${NC}"
                pass=$((pass + 1))
            else
                echo -e "${RED}DIFF${NC}"
                diff <(echo "$actual") "$snapshot" | head -30
                fail=$((fail + 1))
            fi
        else
            echo -e "${RED}FAIL${NC} (execution error)"
            fail=$((fail + 1))
        fi
    done < "$EXAMPLES_DIR/manifest.txt"

    echo ""
    echo -e "Results: ${GREEN}$pass${NC} passed, ${RED}$fail${NC} failed, ${YELLOW}$missing${NC} skipped out of $total"

    if [[ $fail -gt 0 ]]; then
        exit 1
    fi
}

cmd_run() {
    local slug="$1"
    if [[ ! -f "$EXAMPLES_DIR/${slug}.py" ]]; then
        echo "Unknown example: $slug"
        echo "Available: $(cat "$EXAMPLES_DIR/manifest.txt" | tr '\n' ' ')"
        exit 1
    fi
    run_example "$slug"
}

case "${1:-help}" in
    generate)
        echo "=== Generating golden snapshots ==="
        cmd_generate
        ;;
    verify)
        echo "=== Verifying against golden snapshots ==="
        cmd_verify
        ;;
    run)
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 run <slug>"
            exit 1
        fi
        cmd_run "$2"
        ;;
    *)
        echo "Usage: $0 {generate|verify|run <slug>}"
        echo ""
        echo "  generate  — Run all examples and save output as golden snapshots"
        echo "  verify    — Run all examples and compare against golden snapshots"
        echo "  run <slug> — Run a single example"
        exit 1
        ;;
esac
