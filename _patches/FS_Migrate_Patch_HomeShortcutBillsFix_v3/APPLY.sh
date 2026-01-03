#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "== Patch v3: Force Home shortcut routing (Bills -> /bills; others -> legacy) =="

mkdir -p "_patch_backup"
TS="$(date +%Y%m%d-%H%M%S)"

TARGET="app/(tabs)/index.tsx"
if [ ! -f "$TARGET" ]; then
  echo "ERROR: $TARGET not found"
  exit 1
fi

cp "$TARGET" "_patch_backup/app_tabs_index_tsx.$TS.bak"

python3 - <<'PY'
from pathlib import Path

p = Path("app/(tabs)/index.tsx")
s = p.read_text()
lines = s.splitlines(True)

def replace_on_menu_press(lines):
    out = []
    replaced = False
    for ln in lines:
        if (not replaced) and ("const onMenuPress" in ln):
            indent = ln.split("const onMenuPress", 1)[0]
            out.append(indent + 'const onMenuPress = () => router.push("/legacy");\n')
            replaced = True
        else:
            out.append(ln)
    return out, replaced

def replace_on_shortcut_press(lines):
    start = None
    for i, ln in enumerate(lines):
        if "const onShortcutPress" in ln and "=>" in ln:
            start = i
            break
    if start is None:
        return lines, False

    brace = 0
    seen_open = False
    end = None
    for j in range(start, len(lines)):
        ln = lines[j]
        for ch in ln:
            if ch == "{":
                brace += 1
                seen_open = True
            elif ch == "}":
                brace -= 1
        if seen_open and brace == 0:
            end = j
            break

    if end is None:
        return lines, False

    if not lines[end].rstrip().endswith("};"):
        if end + 1 < len(lines) and lines[end + 1].strip() == "};":
            end = end + 1

    indent = lines[start].split("const onShortcutPress", 1)[0]

    replacement_lines = [
        indent + 'const onShortcutPress = (item: ShortcutItem) => {\n',
        indent + '  // Bills is now Router-native.\n',
        indent + '  if (item.label === "Bills") {\n',
        indent + '    router.push("/bills");\n',
        indent + '    return;\n',
        indent + '  }\n',
        "\n",
        indent + '  // Everything else stays in legacy for now (deep-link to label where possible).\n',
        indent + '  router.push({ pathname: "/legacy", params: { to: item.label } });\n',
        indent + '};\n',
    ]

    new_lines = lines[:start] + replacement_lines + lines[end+1:]
    return new_lines, True

lines, ok_menu = replace_on_menu_press(lines)
lines, ok_short = replace_on_shortcut_press(lines)

p.write_text("".join(lines))
print(f"OK: onMenuPress updated={ok_menu}; onShortcutPress updated={ok_short}")
PY

echo "Done."
