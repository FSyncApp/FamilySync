\
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "== Patch v2: Fix Home shortcut routing (Bills -> /bills; others -> legacy) =="

mkdir -p "_patch_backup"
TS="$(date +%Y%m%d-%H%M%S)"

TARGET="app/(tabs)/index.tsx"
if [ ! -f "$TARGET" ]; then
  echo "ERROR: $TARGET not found"
  exit 1
fi

cp "$TARGET" "_patch_backup/app_tabs_index_tsx.$TS.bak"

python3 - <<'PY'
import re
from pathlib import Path

p = Path("app/(tabs)/index.tsx")
s = p.read_text()

# 1) Fix onMenuPress (if it exists)
s, n1 = re.subn(
    r'const\s+onMenuPress\s*=\s*\(\)\s*=>\s*[^;]*;',
    'const onMenuPress = () => router.push("/legacy");',
    s,
    count=1,
    flags=re.MULTILINE,
)

# 2) Replace onShortcutPress entirely (robust DOTALL)
pattern = r'const\s+onShortcutPress\s*=\s*\(item:\s*ShortcutItem\)\s*=>\s*\{[\s\S]*?\n\};'
m = re.search(pattern, s)
if not m:
    raise SystemExit("Could not find onShortcutPress in app/(tabs)/index.tsx")

replacement = '''const onShortcutPress = (item: ShortcutItem) => {
  // Bills is now Router-native.
  if (item.label === "Bills") {
    router.push("/bills");
    return;
  }

  // Everything else stays in legacy for now (deep-link to label where possible).
  router.push({ pathname: "/legacy", params: { to: item.label } });
};'''

s = s[:m.start()] + replacement + s[m.end():]

p.write_text(s)
print(f"OK: Updated onMenuPress replacements={n1}; Updated onShortcutPress.")
PY

echo "Done."
