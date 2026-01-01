/** FS PATCH: Bills list — fresh empty state placeholder (UI-only) */
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { BillsStackParamList } from "../../navigation/BillsStack";
import { listBills, type BillRow } from "../../data/billsStore";

type Nav = NativeStackNavigationProp<BillsStackParamList>;

type SortMode = "next" | "az";

function formatDateShort(d: Date) {
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function daysBetweenUtc(a: Date, b: Date) {
  const a0 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const b0 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((b0 - a0) / (1000 * 60 * 60 * 24));
}

function parseISODateMaybe(value: any): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function getBillPrimaryDate(item: any): { kind: "renews" | "expires"; date: Date } | null {
  const auto = Boolean(item?.auto_renew ?? item?.autoRenew ?? false);
  const renewal = parseISODateMaybe(item?.renewal_date ?? item?.renewalDate);
  const expiry = parseISODateMaybe(item?.expiry_date ?? item?.expiryDate);

  if (auto && renewal) return { kind: "renews", date: renewal };
  if (!auto && expiry) return { kind: "expires", date: expiry };

  // Fallbacks if auto flag is missing
  if (renewal) return { kind: "renews", date: renewal };
  if (expiry) return { kind: "expires", date: expiry };

  return null;
}

function getReminderDate(item: any): Date | null {
  const enabled = Boolean(item?.reminder_enabled ?? item?.reminderEnabled ?? false);
  if (!enabled) return null;

  const days = Number(item?.reminder_days_before ?? item?.reminderDaysBefore ?? 7);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 7;

  const primary = getBillPrimaryDate(item);
  if (!primary) return null;

  const d = new Date(primary.date);
  d.setDate(d.getDate() - safeDays);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function getEffectiveDueDate(item: any): Date | null {
  const primary = getBillPrimaryDate(item);
  return primary?.date ?? null;
}

function formatMoneyGeneric(amount: number) {
  // Currency-agnostic: no symbol, just a clean numeric.
  const n = Number.isFinite(amount) ? amount : 0;
  const v = Math.round(n * 100) / 100;
  return v.toFixed(2);
}

function formatDueLine(primary: { kind: "renews" | "expires"; date: Date } | null) {
  if (!primary) return "";
  const verb = primary.kind === "renews" ? "Renews" : "Expires";
  return `${verb} ${formatDateShort(primary.date)}`;
}

function formatInDaysOrDate(target: Date) {
  const now = new Date();
  const diff = daysBetweenUtc(now, target);

  // Under 1 month => "In X days" / "Today" / "Overdue..."
  if (Math.abs(diff) < 30) {
    if (diff === 0) return "Today";
    if (diff === 1) return "In 1 day";
    if (diff > 1) return `In ${diff} days`;
    if (diff === -1) return "Overdue by 1 day";
    return `Overdue by ${Math.abs(diff)} days`;
  }

  return formatDateShort(target);
}

export default function BillsListScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<BillRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("next");

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await listBills();
      setItems(Array.isArray(next) ? next : []);
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load bills.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Bills",
      headerRight: () => (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          onPress={() => navigation.navigate("BillForm", { mode: "create" })}
          style={styles.headerAdd}
        >
          <Ionicons name="add" size={22} color={vars.ink} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const itemsSorted = useMemo(() => {
    const base = [...items];

    if (sortMode === "az") {
      base.sort((a: any, b: any) =>
        String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" })
      );
      return base;
    }

    base.sort((a: any, b: any) => {
      const da = getEffectiveDueDate(a);
      const db = getEffectiveDueDate(b);
      const tda = da ? da.getTime() : Number.POSITIVE_INFINITY;
      const tdb = db ? db.getTime() : Number.POSITIVE_INFINITY;
      if (tda !== tdb) return tda - tdb;

      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" });
    });

    return base;
  }, [items, sortMode]);

  const nextUp = useMemo(() => {
    const now = new Date();
    const candidates = items
      .map((i: any) => {
        const due = getEffectiveDueDate(i);
        if (!due) return null;
        if (Number.isNaN(due.getTime())) return null;
        return { item: i, due };
      })
      .filter(Boolean) as { item: any; due: Date }[];

    const upcoming = candidates.sort((a, b) => a.due.getTime() - b.due.getTime());
    if (!upcoming.length) return null;

    const first = upcoming[0];
    const name = String(first.item?.name ?? "").trim() || "Unnamed bill";
    const dueLine = formatInDaysOrDate(first.due);

    // If due is in the past we still show it: "Overdue by ..."
    const diff = daysBetweenUtc(now, first.due);
    const isSoon = Math.abs(diff) < 30;

    return { name, due: first.due, dueLine, isSoon };
  }, [items]);

  const showEmpty = !loading && items.length === 0 && !loadError;

  const data = useMemo(() => {
    if (loading) return [];
    if (showEmpty) return [{ id: "__empty__", name: "" } as any];
    return [...itemsSorted, { id: "__add__", name: "" } as any];
  }, [itemsSorted, loading, showEmpty]);

  const SortPill = useMemo(() => {
    if (showEmpty || loading) return null;

    return (
      <View style={styles.sortRow}>
        <View style={styles.sortPill}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSortMode("next")}
            style={[styles.sortItem, sortMode === "next" && styles.sortItemActive]}
          >
            <Text style={[styles.sortText, sortMode === "next" && styles.sortTextActive]}>Next up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSortMode("az")}
            style={[styles.sortItem, sortMode === "az" && styles.sortItemActive]}
          >
            <Text style={[styles.sortText, sortMode === "az" && styles.sortTextActive]}>A–Z</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sortHint} numberOfLines={1}>
          {sortMode === "next" ? "Sorted by next renewal/expiry" : "Sorted alphabetically"}
        </Text>
      </View>
    );
  }, [loading, showEmpty, sortMode]);

  const BillTile = useCallback(
    ({ item }: { item: BillRow }) => {
      const provider = (item as any).provider ?? "";
      const frequency = (item as any).frequency ?? "";
      const reminderAt = getReminderDate(item as any);
      const primaryDate = getBillPrimaryDate(item as any);

      const dueLine = formatDueLine(primaryDate);

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate("BillForm", { mode: "edit", billId: (item as any).id })}
          style={styles.tile}
        >
          <View style={styles.tileTop}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.tileTitle} numberOfLines={1}>
                {(item as any).name}
              </Text>

              {!!provider && (
                <Text style={styles.tileSub} numberOfLines={1}>
                  {provider}
                </Text>
              )}

              {!!frequency && (
                <Text style={styles.tileMeta} numberOfLines={1}>
                  {frequency}
                </Text>
              )}

              {!!dueLine && (
                <Text style={styles.tileMeta2} numberOfLines={1}>
                  {dueLine}
                </Text>
              )}
            </View>

            <View style={styles.tileRight}>
              <Text style={styles.tileAmount} numberOfLines={1}>
                {formatMoneyGeneric(Number((item as any).amount ?? 0))}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={vars.inkMuted} />
            </View>
          </View>

          {!!reminderAt && (
            <View style={styles.reminderPill}>
              <Ionicons name="alarm-outline" size={14} color={vars.inkMuted} />
              <Text style={styles.reminderText} numberOfLines={1}>
                Reminder {formatDateShort(reminderAt)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  const AddTile = useCallback(
    () => (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("BillForm", { mode: "create" })}
        style={[styles.tile, styles.addTile]}
      >
        <Ionicons name="add-circle-outline" size={20} color={vars.inkMuted} />
        <Text style={styles.addTileText}>Add bill</Text>
      </TouchableOpacity>
    ),
    [navigation]
  );

  const EmptyState = useCallback(
    () => (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconRow}>
            <View style={styles.emptyIconBadge}>
              <Ionicons name="receipt-outline" size={22} color={vars.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyTitle}>No bills yet</Text>
              <Text style={styles.emptySubtitle} numberOfLines={2}>
                Add your regular bills so your family can see what’s coming up.
              </Text>
            </View>
          </View>

          <View style={styles.emptyDivider} />

          <View style={styles.emptyBullets}>
            <View style={styles.bulletRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={vars.inkMuted} />
              <Text style={styles.bulletText}>Track renewals and expiries</Text>
            </View>
            <View style={styles.bulletRow}>
              <Ionicons name="notifications-outline" size={16} color={vars.inkMuted} />
              <Text style={styles.bulletText}>Optional reminders</Text>
            </View>
            <View style={styles.bulletRow}>
              <Ionicons name="people-outline" size={16} color={vars.inkMuted} />
              <Text style={styles.bulletText}>Shared clarity for the household</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate("BillForm", { mode: "create" })}
            style={styles.emptyCta}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.emptyCtaText}>Add your first bill</Text>
          </TouchableOpacity>

          <Text style={styles.emptyTip} numberOfLines={2}>
            Tip: start with the ones you never want to miss (insurance, utilities, subscriptions).
          </Text>
        </View>
      </View>
    ),
    [navigation]
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.descriptor} numberOfLines={1}>
        Keep your family’s bills synchronised.
      </Text>

      {!showEmpty && !loading && !!nextUp && (
        <View style={styles.nextUpCard}>
          <View style={styles.nextUpLeft}>
            <Text style={styles.nextUpLabel}>Next up</Text>
            <Text style={styles.nextUpName} numberOfLines={1}>
              {nextUp.name}
            </Text>
            <Text style={styles.nextUpDue} numberOfLines={1}>
              {nextUp.dueLine}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSortMode("next")}
            style={styles.nextUpChip}
            accessibilityLabel="Sort by next up"
          >
            <Ionicons name="time-outline" size={16} color={vars.inkMuted} />
            <Text style={styles.nextUpChipText}>Next up</Text>
          </TouchableOpacity>
        </View>
      )}

      {!showEmpty && !loading && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total bills</Text>
            <Text style={styles.statValue}>{items.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Next up</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {nextUp ? formatInDaysOrDate(nextUp.due) : "None"}
            </Text>
          </View>
        </View>
      )}

      {SortPill}

      {!!loadError && (
        <View style={styles.errorCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="alert-circle-outline" size={18} color={vars.inkMuted} />
            <Text style={styles.errorTitle}>Couldn’t load bills</Text>
          </View>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it: any) => it.id}
          renderItem={({ item }: any) =>
            item.id === "__empty__" ? <EmptyState /> : item.id === "__add__" ? <AddTile /> : <BillTile item={item} />
          }
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const vars = {
  bg: "#F6F7F9",
  ink: "#111827",
  inkMuted: "#6B7280",
  card: "#FFFFFF",
  border: "#E5E7EB",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vars.bg, padding: 16 },

  descriptor: {
    marginTop: 2,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "700",
    color: vars.inkMuted,
    textAlign: "center",
  },

  headerAdd: {
    marginRight: 8,
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  listContent: { paddingBottom: 20 },

  // Next up card (3 lines)
  nextUpCard: {
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  nextUpLeft: { flex: 1, paddingRight: 10 },
  nextUpLabel: { fontSize: 12, fontWeight: "900", color: vars.inkMuted },
  nextUpName: { marginTop: 4, fontSize: 16, fontWeight: "900", color: vars.ink },
  nextUpDue: { marginTop: 4, fontSize: 13, fontWeight: "800", color: vars.inkMuted },
  nextUpChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "rgba(17,24,39,0.03)",
  },
  nextUpChipText: { fontSize: 12, fontWeight: "900", color: vars.inkMuted },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: vars.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: vars.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: vars.inkMuted },
  statValue: { marginTop: 2, fontSize: 16, fontWeight: "900", color: vars.ink },

  // Sort pill
  sortRow: { alignItems: "center", marginBottom: 10 },
  sortPill: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: vars.card,
  },
  sortItem: { paddingHorizontal: 14, paddingVertical: 8 },
  sortItemActive: { backgroundColor: "rgba(17,24,39,0.06)" },
  sortText: { fontSize: 12, fontWeight: "900", color: vars.inkMuted },
  sortTextActive: { color: vars.ink },
  sortHint: { marginTop: 6, fontSize: 12, fontWeight: "700", color: vars.inkMuted },

  // Error card
  errorCard: {
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 14,
    marginBottom: 12,
  },
  errorTitle: { fontSize: 13, fontWeight: "900", color: vars.ink },
  errorText: { marginTop: 6, fontSize: 12, fontWeight: "700", color: vars.inkMuted },
  retryBtn: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "#FFFFFF",
  },
  retryText: { fontSize: 13, fontWeight: "900", color: vars.ink },

  // Tiles
  tile: {
    backgroundColor: vars.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: vars.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  tileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileTitle: { fontSize: 14, fontWeight: "900", color: vars.ink },
  tileSub: { marginTop: 3, fontSize: 12, fontWeight: "700", color: vars.inkMuted },
  tileMeta: { marginTop: 2, fontSize: 11, fontWeight: "700", color: vars.inkMuted },
  tileMeta2: { marginTop: 6, fontSize: 12, fontWeight: "800", color: vars.inkMuted },

  tileRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  tileAmount: { fontSize: 14, fontWeight: "900", color: vars.ink },

  reminderPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "rgba(17,24,39,0.03)",
  },
  reminderText: { fontSize: 11, fontWeight: "800", color: vars.inkMuted },

  addTile: {
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 14,
  },
  addTileText: { fontSize: 14, fontWeight: "900", color: vars.inkMuted },

  // Empty state (fresh)
  emptyWrap: { flex: 1, paddingTop: 18 },
  emptyCard: {
    backgroundColor: vars.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 16,
  },
  emptyIconRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emptyIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
  },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: vars.ink },
  emptySubtitle: { marginTop: 4, fontSize: 13, fontWeight: "700", color: vars.inkMuted, lineHeight: 18 },

  emptyDivider: { height: 1, backgroundColor: vars.border, marginVertical: 14 },

  emptyBullets: { gap: 10 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bulletText: { fontSize: 13, fontWeight: "800", color: vars.inkMuted },

  emptyCta: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: vars.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyCtaText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },

  emptyTip: { marginTop: 12, fontSize: 12, fontWeight: "700", color: vars.inkMuted, lineHeight: 17 },
});
