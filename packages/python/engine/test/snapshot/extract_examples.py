#!/usr/bin/env python3
"""Extract Python algorithm examples from frontend constants into individual .py files."""

import re, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..', '..', '..'))
ALGO_TS = os.path.join(REPO_ROOT, 'apps', 'web', 'frontend', 'src', 'constants', 'algorithms.ts')
OUT_DIR = os.path.join(SCRIPT_DIR, 'examples')


def extract_python_examples(ts_path):
    with open(ts_path) as f:
        content = f.read()

    # Find the PYTHON_ALGORITHMS section
    py_start = content.find('PYTHON_ALGORITHMS')
    if py_start == -1:
        return []
    content = content[py_start:]

    pattern = re.compile(
        r'name:\s*"([^"]+)".*?'
        r'(?:category:\s*"([^"]+)".*?)?'
        r'code:\s*`(.*?)`',
        re.DOTALL
    )

    examples = []
    for m in pattern.finditer(content):
        name, category, code = m.group(1), m.group(2) or "", m.group(3)
        # Skip Java examples that might leak in
        if 'public class' in code:
            continue
        examples.append((name, category, code.strip()))
    return examples


def slugify(name):
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    examples = extract_python_examples(ALGO_TS)

    manifest = []
    for name, category, code in examples:
        slug = slugify(name)
        filepath = os.path.join(OUT_DIR, f'{slug}.py')
        with open(filepath, 'w') as f:
            f.write(code + '\n')
        manifest.append(slug)
        print(f'  {slug}.py  ({category}: {name})')

    with open(os.path.join(OUT_DIR, 'manifest.txt'), 'w') as f:
        f.write('\n'.join(manifest) + '\n')

    print(f'\nExtracted {len(manifest)} Python examples to {OUT_DIR}/')


if __name__ == '__main__':
    main()
