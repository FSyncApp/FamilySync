/** FS PATCH: Bills list — Next up box (3 lines) + sort by due date (not reminder) */
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

function formatGBP(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  const v = Math.round(n * 100) / 100;
  return `£${v.toFixed(2)}`;
}

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

  // Fallbacks if legacy data is incomplete
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

    // "Next up" sorting: effective due date (renewal/expiry) first, reminder is secondary display only.
    base.sort((a: any, b: any) => {
      const da = getBillPrimaryDate(a)?.date;
      const db = getBillPrimaryDate(b)?.date;

      const ta = da ? da.getTime() : Number.POSITIVE_INFINITY;
      const tb = db ? db.getTime() : Number.POSITIVE_INFINITY;

      if (ta !== tb) return ta - tb;

      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" });
    });

    return base;
  }, [items, sortMode]);

  const nextUp = useMemo(() => {
    const now = new Date();

    const withDue = items
      .map((it: any) => {
        const primary = getBillPrimaryDate(it);
        if (!primary) return null;
        return { id: String(it?.id ?? ""), name: String(it?.name ?? ""), primary };
      })
      .filter(Boolean) as { id: string; name: string; primary: { kind: "renews" | "expires"; date: Date } }[];

    if (!withDue.length) {
      return { name: "None set", detail: "" };
    }

    withDue.sort((a, b) => a.primary.date.getTime() - b.primary.date.getTime());
    const top = withDue[0];

    const diff = daysBetweenUtc(now, top.primary.date);
    const withinMonth = diff >= 0 && diff < 31;

    let detail = "";
    if (withinMonth) {
      if (diff === 0) detail = "Today";
      else if (diff === 1) detail = "In 1 day";
      else detail = `In ${diff} days`;
    } else {
      detail = formatDateShort(top.primary.date);
    }

    return { name: top.name || "Bills", detail };
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
      const primaryDate = getBillPrimaryDate(item as any);

      const dateLabel = primaryDate
        ? `${primaryDate.kind === "renews" ? "Renews" : "Expires"} ${formatDateShort(primaryDate.date)}`
        : "";

      const reminderAt = getReminderDate(item as any);

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

              {!!dateLabel && (
                <Text style={styles.tileMeta2} numberOfLines={1}>
                  {dateLabel}
                </Text>
              )}
            </View>

            <View style={styles.tileRight}>
              <Text style={styles.tileAmount} numberOfLines={1}>
                {formatGBP((item as any).amount)}
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

  const EmptyCard = useCallback(
    () => (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No bills yet</Text>
        <Text style={styles.emptyText}>Add your household bills to keep everything in sync.</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("BillForm", { mode: "create" })}
          style={styles.emptyCta}
        >
          <Ionicons name="add" size={18} color={vars.ink} />
          <Text style={styles.emptyCtaText}>Add bill</Text>
        </TouchableOpacity>
      </View>
    ),
    [navigation]
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.descriptor} numberOfLines={1}>
        Keep your family’s bills synchronised.
      </Text>

      {!showEmpty && !loading && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total bills</Text>
            <Text style={styles.statValue}>{items.length}</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Next up</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {nextUp.name}
            </Text>
            <Text style={styles.statSub} numberOfLines={1}>
              {nextUp.detail}
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
          renderItem={({ item }: any) => {
            if (item.id === "__add__") return <AddTile />;
            if (item.id === "__empty__") return <EmptyCard />;
            return <BillTile item={item} />;
          }}
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

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: vars.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: vars.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: vars.inkMuted },
  statValue: { marginTop: 2, fontSize: 16, fontWeight: "900", color: vars.ink },
  statSub: { marginTop: 2, fontSize: 12, fontWeight: "800", color: vars.inkMuted },

  sortRow: { marginBottom: 12, alignItems: "center" },
  sortPill: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: vars.card,
    borderRadius: 999,
    overflow: "hidden",
  },
  sortItem: { paddingHorizontal: 14, paddingVertical: 8 },
  sortItemActive: { backgroundColor: "rgba(17,24,39,0.06)" },
  sortText: { fontSize: 12, fontWeight: "900", color: vars.inkMuted },
  sortTextActive: { color: vars.ink },
  sortHint: { marginTop: 8, fontSize: 12, fontWeight: "700", color: vars.inkMuted },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerAdd: {
    marginRight: 8,
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
  },

  listContent: { paddingBottom: 20 },

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
  tileMeta2: { marginTop: 4, fontSize: 12, fontWeight: "800", color: vars.inkMuted },

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

  emptyCard: {
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: vars.ink, marginBottom: 6 },
  emptyText: { fontSize: 13, fontWeight: "700", color: vars.inkMuted },
  emptyCta: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "#FFFFFF",
  },
  emptyCtaText: { fontSize: 13, fontWeight: "900", color: vars.ink },

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
});
