#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "== FamilySyncMigrate patch: Router-native Bills list =="

cd "$ROOT"

# Safety: backup any existing targets
mkdir -p "_patch_backup"
TS="$(date +%Y%m%d-%H%M%S)"

if [ -f "app/bills.tsx" ]; then
  echo "Backing up app/bills.tsx -> _patch_backup/app_bills_tsx.$TS.bak"
  cp "app/bills.tsx" "_patch_backup/app_bills_tsx.$TS.bak"
  rm -f "app/bills.tsx"
fi

if [ -f "app/(tabs)/index.tsx" ]; then
  echo "Backing up app/(tabs)/index.tsx -> _patch_backup/app_tabs_index_tsx.$TS.bak"
  cp "app/(tabs)/index.tsx" "_patch_backup/app_tabs_index_tsx.$TS.bak"
fi

mkdir -p "app/bills"

echo "Writing Router-native Bills list: app/bills/index.tsx"
cat > "app/bills/index.tsx" <<'EOF'
/** Router Bills (Phase 2 migration): Router-native list UI, backed by legacy billsStore.
 *  - Navigation: Bills shortcut now routes here.
 *  - Add/Edit: temporarily opens Legacy Bills (until BillForm is migrated).
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

import { listBills, type BillRow } from "../../migration_src/client/data/billsStore";

type SortMode = "due" | "az";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function parseISODateMaybe(s?: string | null): Date | null {
  if (!s) return null;
  // Accept YYYY-MM-DD or full ISO strings.
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

function formatShortDate(d: Date) {
  const day = pad2(d.getDate());
  const mon = d.toLocaleString("en-GB", { month: "short" });
  return `${day} ${mon}`;
}

function addMonths(d: Date, n: number) {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}
function addYears(d: Date, n: number) {
  const out = new Date(d);
  out.setFullYear(out.getFullYear() + n);
  return out;
}

function rollForwardByFrequency(now: Date, base: Date, frequency: string): Date {
  const freq = (frequency || "").toLowerCase().trim();
  if (!freq) return base;

  // Supported: weekly, monthly, quarterly, yearly (legacy format uses these strings)
  const map: Record<string, { unit: "week" | "month" | "year"; step: number }> = {
    weekly: { unit: "week", step: 1 },
    fortnightly: { unit: "week", step: 2 },
    monthly: { unit: "month", step: 1 },
    quarterly: { unit: "month", step: 3 },
    yearly: { unit: "year", step: 1 },
    annual: { unit: "year", step: 1 },
  };

  const def = map[freq];
  if (!def) return base;

  let cursor = new Date(base);
  // Roll forward until >= now (date-only comparison)
  while (cursor.getTime() < now.getTime()) {
    if (def.unit === "week") cursor = new Date(cursor.getTime() + def.step * 7 * 24 * 60 * 60 * 1000);
    else if (def.unit === "month") cursor = addMonths(cursor, def.step);
    else cursor = addYears(cursor, def.step);
  }
  return cursor;
}

function getBillPrimaryDate(item: any, now: Date): { kind: "renews" | "expires"; date: Date } | null {
  const auto = Boolean(item?.auto_renew ?? item?.autoRenew ?? false);
  const renewalRaw = parseISODateMaybe(item?.renewal_date ?? item?.renewalDate);
  const expiryRaw = parseISODateMaybe(item?.expiry_date ?? item?.expiryDate);
  const frequency = item?.frequency ?? item?.freq ?? "";

  const renewal = renewalRaw && auto ? rollForwardByFrequency(now, renewalRaw, frequency) : renewalRaw;
  const expiry = expiryRaw;

  if (auto && renewal) return { kind: "renews", date: renewal };
  if (!auto && expiry) return { kind: "expires", date: expiry };

  // Fallbacks if flag is missing
  if (renewal) return { kind: "renews", date: renewal };
  if (expiry) return { kind: "expires", date: expiry };

  return null;
}

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function formatMoneyGeneric(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  const v = Math.round(n * 100) / 100;
  return v.toFixed(2);
}

export default function BillsIndexScreen() {
  const [items, setItems] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("due");

  const now = useMemo(() => new Date(), [items.length, sortMode, loading, refreshing]);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const rows = await listBills();
      setItems(rows ?? []);
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load bills");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const itemsSorted = useMemo(() => {
    const base = [...items];
    if (sortMode === "az") {
      base.sort((a: any, b: any) => String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "en"));
      return base;
    }

    // due sort: nearest primary date first, unknowns last
    base.sort((a: any, b: any) => {
      const pa = getBillPrimaryDate(a, now);
      const pb = getBillPrimaryDate(b, now);
      if (!pa && !pb) return 0;
      if (!pa) return 1;
      if (!pb) return -1;
      return pa.date.getTime() - pb.date.getTime();
    });
    return base;
  }, [items, sortMode, now]);

  const stats = useMemo(() => {
    const total = items.length;
    let next: { label: string; days: number; date: Date } | null = null;

    for (const it of items) {
      const p = getBillPrimaryDate(it, now);
      if (!p) continue;
      const d = daysBetween(now, p.date);
      if (d < 0) continue;
      const label = `${p.kind === "renews" ? "Renews" : "Expires"} ${formatShortDate(p.date)}`;
      if (!next || d < next.days) next = { label, days: d, date: p.date };
    }

    return { total, nextLabel: next?.label ?? "None scheduled" };
  }, [items, now]);

  const showEmpty = !loading && items.length === 0 && !loadError;

  const openLegacyBills = () => {
    router.push({ pathname: "/legacy", params: { to: "Bills" } });
  };

  const Header = (
    <View style={styles.headerWrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Bills</Text>
          <Text style={styles.subtitle}>Keep your family’s bills synchronised.</Text>
        </View>

        <TouchableOpacity onPress={openLegacyBills} style={styles.legacyPill} activeOpacity={0.88}>
          <Ionicons name="swap-horizontal-outline" size={16} color={stylesVars.ink} />
          <Text style={styles.legacyPillText}>Legacy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Next</Text>
          <Text style={styles.statValueSmall} numberOfLines={1}>
            {stats.nextLabel}
          </Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, sortMode === "due" && styles.segmentBtnActive]}
            onPress={() => setSortMode("due")}
          >
            <Text style={[styles.segmentText, sortMode === "due" && styles.segmentTextActive]}>Due</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, sortMode === "az" && styles.segmentBtnActive]}
            onPress={() => setSortMode("az")}
          >
            <Text style={[styles.segmentText, sortMode === "az" && styles.segmentTextActive]}>A–Z</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            Alert.alert(
              "Bills form not migrated yet",
              "For now, add/edit bills in the Legacy Bills screen.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Legacy Bills", onPress: openLegacyBills },
              ]
            );
          }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading bills…</Text>
      </View>
    );
  }

  if (showEmpty) {
    return (
      <View style={styles.screen}>
        {Header}
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={24} color={stylesVars.inkMuted} />
            <Text style={styles.emptyTitle}>No bills added yet</Text>
            <Text style={styles.emptyBody}>
              Add your regular bills so your family can keep track of what’s renewing and what’s expiring.
            </Text>

            <TouchableOpacity style={styles.emptyAction} onPress={openLegacyBills}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyActionText}>Add bills (Legacy)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={itemsSorted}
        keyExtractor={(it: any) => String(it?.id)}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const primary = getBillPrimaryDate(item as any, now);
          const primaryLabel = primary
            ? `${primary.kind === "renews" ? "Renews" : "Expires"} ${formatShortDate(primary.date)}`
            : "Date not set";

          const days = primary ? daysBetween(now, primary.date) : null;
          const isSoon = typeof days === "number" && days >= 0 && days <= 7;
          const isOverdue = typeof days === "number" && days < 0;

          const cost = (item as any)?.cost ?? (item as any)?.amount ?? null;
          const costLabel = cost != null ? formatMoneyGeneric(Number(cost)) : null;

          return (
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.row}
              onPress={openLegacyBills}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {(item as any)?.name ?? "Bill"}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {primaryLabel}
                  {isSoon ? " • Soon" : isOverdue ? " • Overdue" : ""}
                </Text>
              </View>

              <View style={styles.rowRight}>
                {costLabel ? <Text style={styles.rowAmount}>{costLabel}</Text> : null}
                <Ionicons name="chevron-forward" size={18} color={stylesVars.inkMuted} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const stylesVars = {
  ink: "#101828",
  inkMuted: "#667085",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(220,223,232,0.75)",
  shadow: "rgba(16,24,40,0.06)",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FA" },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontWeight: "700", color: stylesVars.inkMuted },

  headerWrap: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerLeft: { flex: 1, paddingRight: 10 },
  title: { fontSize: 28, fontWeight: "900", color: stylesVars.ink, letterSpacing: -0.2 },
  subtitle: { marginTop: 4, fontSize: 13, fontWeight: "700", color: stylesVars.inkMuted },

  legacyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
  },
  legacyPillText: { fontWeight: "800", color: stylesVars.ink },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  statBox: {
    flex: 1,
    backgroundColor: stylesVars.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    padding: 12,
  },
  statLabel: { fontSize: 12, fontWeight: "800", color: stylesVars.inkMuted },
  statValue: { marginTop: 6, fontSize: 22, fontWeight: "900", color: stylesVars.ink },
  statValueSmall: { marginTop: 6, fontSize: 14, fontWeight: "900", color: stylesVars.ink },

  controlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  segment: {
    flexDirection: "row",
    backgroundColor: stylesVars.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stylesVars.border,
    overflow: "hidden",
  },
  segmentBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  segmentBtnActive: { backgroundColor: "rgba(16,24,40,0.06)" },
  segmentText: { fontWeight: "800", color: stylesVars.inkMuted },
  segmentTextActive: { color: stylesVars.ink },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  addBtnText: { color: "#fff", fontWeight: "900" },

  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },
  errorText: { fontWeight: "800", color: "#991B1B" },
  retryBtn: { marginTop: 10, alignSelf: "flex-start" },
  retryText: { fontWeight: "900", color: "#111827" },

  listContent: { paddingBottom: 20 },
  row: {
    marginHorizontal: 18,
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowTitle: { fontSize: 14, fontWeight: "900", color: stylesVars.ink },
  rowSub: { marginTop: 4, fontSize: 13, fontWeight: "700", color: stylesVars.inkMuted },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowAmount: { fontWeight: "900", color: stylesVars.ink },

  emptyWrap: { paddingHorizontal: 18, paddingTop: 10, flex: 1 },
  emptyCard: {
    borderRadius: 18,
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    padding: 16,
  },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: "900", color: stylesVars.ink },
  emptyBody: { marginTop: 6, fontSize: 13, fontWeight: "700", color: stylesVars.inkMuted, lineHeight: 18 },
  emptyAction: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyActionText: { color: "#fff", fontWeight: "900" },
});

EOF

echo "Patching Home shortcut: route Bills -> /bills (others keep legacy deep-link)"
python3 - <<'PY'
import re
from pathlib import Path

p = Path("app/(tabs)/index.tsx")
s = p.read_text()

# Replace the current onShortcutPress implementation with a version that routes Bills to /bills.
# We do this by locating the function and replacing its body conservatively.
pattern = r"const\s+onShortcutPress\s*=\s*\(item:\s*ShortcutItem\)\s*=>\s*\{[\s\S]*?\n\};"
m = re.search(pattern, s)
if not m:
    raise SystemExit("Could not find onShortcutPress in app/(tabs)/index.tsx (unexpected file shape).")

replacement = '''const onShortcutPress = (item: ShortcutItem) => {
  // Bills is now Router-native.
  if (item.label === "Bills") {
    router.push("/bills");
    return;
  }

  // Everything else stays in legacy for now (deep-link to label where possible).
  router.push({ pathname: "/legacy", params: { to: item.label } });
};'''
s2 = s[:m.start()] + replacement + s[m.end():]
p.write_text(s2)
print("OK: Updated onShortcutPress.")
PY

echo "Done. Next: reload the app and test Bills shortcut."
