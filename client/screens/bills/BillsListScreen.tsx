/** FS PATCH: Bills list — currency-neutral + empty state hero (UI-only) */
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

function formatAmountNeutral(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  const v = Math.round(n * 100) / 100;
  // Currency-neutral formatting (no symbol)
  return `${v.toFixed(2)}`;
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

function primaryDateDisplay(primary: { kind: "renews" | "expires"; date: Date }, now: Date) {
  const diff = daysBetweenUtc(now, primary.date);
  const withinMonth = diff >= 0 && diff <= 31;

  if (withinMonth) {
    if (diff === 0) return "Today";
    if (diff === 1) return "In 1 day";
    return `In ${diff} days`;
  }

  return formatDateShort(primary.date);
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
          activeOpacity={0.9}
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

  const showEmpty = !loading && items.length === 0 && !loadError;

  const itemsSorted = useMemo(() => {
    const base = [...items];

    if (sortMode === "az") {
      base.sort((a: any, b: any) =>
        String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" })
      );
      return base;
    }

    // "Next up" = sort by effective due date (primary date), then name
    base.sort((a: any, b: any) => {
      const da = getBillPrimaryDate(a)?.date;
      const db = getBillPrimaryDate(b)?.date;
      const tda = da ? da.getTime() : Number.POSITIVE_INFINITY;
      const tdb = db ? db.getTime() : Number.POSITIVE_INFINITY;
      if (tda !== tdb) return tda - tdb;
      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" });
    });

    return base;
  }, [items, sortMode]);

  const nextUpBox = useMemo(() => {
    const now = new Date();
    const withPrimary = items
      .map((i: any) => ({ item: i, primary: getBillPrimaryDate(i) }))
      .filter((x) => !!x.primary) as { item: any; primary: { kind: "renews" | "expires"; date: Date } }[];

    withPrimary.sort((a, b) => a.primary.date.getTime() - b.primary.date.getTime());
    if (!withPrimary.length) return null;

    const top = withPrimary[0];
    const kind = top.primary.kind === "renews" ? "Renews" : "Expires";
    const line3 = `${kind} ${primaryDateDisplay(top.primary, now)}`;

    return {
      title: "Next up",
      name: String(top.item?.name ?? ""),
      line3,
    };
  }, [items]);

  const nextReminderBox = useMemo(() => {
    const now = new Date();
    const candidates = items
      .map((i: any) => getReminderDate(i))
      .filter(Boolean) as Date[];

    const upcoming = candidates
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (!upcoming.length) return { primary: "None set", secondary: "" };

    const d = upcoming[0];
    const diff = daysBetweenUtc(now, d);

    let primary = "";
    if (diff === 0) primary = "Today";
    else if (diff === 1) primary = "In 1 day";
    else if (diff > 1) primary = `In ${diff} days`;
    else if (diff === -1) primary = "Overdue by 1 day";
    else primary = `Overdue by ${Math.abs(diff)} days`;

    return { primary, secondary: formatDateShort(d) };
  }, [items]);

  const data = useMemo(() => {
    if (loading) return [];
    if (showEmpty) return [{ id: "__empty__", name: "" } as any];
    return [...itemsSorted, { id: "__add__", name: "" } as any];
  }, [itemsSorted, loading, showEmpty]);

  const BillTile = useCallback(
    ({ item }: { item: BillRow }) => {
      const provider = (item as any).provider ?? "";
      const primary = getBillPrimaryDate(item as any);
      const now = new Date();

      const dueLine = primary
        ? `${primary.kind === "renews" ? "Renews" : "Expires"} ${primaryDateDisplay(primary, now)}`
        : "";

      return (
        <TouchableOpacity
          activeOpacity={0.88}
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

              {!!dueLine && (
                <Text style={styles.tileMeta} numberOfLines={1}>
                  {dueLine}
                </Text>
              )}
            </View>

            <View style={styles.tileRight}>
              <Text style={styles.tileAmount} numberOfLines={1}>
                {formatAmountNeutral((item as any).amount)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={vars.inkMuted} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  const AddTile = useCallback(
    () => (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => navigation.navigate("BillForm", { mode: "create" })}
        style={[styles.tile, styles.addTile]}
      >
        <Ionicons name="add-circle-outline" size={20} color={vars.inkMuted} />
        <Text style={styles.addTileText}>Add bill</Text>
      </TouchableOpacity>
    ),
    [navigation]
  );

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
      </View>
    );
  }, [loading, showEmpty, sortMode]);

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
            {nextUpBox ? (
              <>
                <Text style={styles.statLabel}>{nextUpBox.title}</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {nextUpBox.name}
                </Text>
                <Text style={styles.statSub} numberOfLines={1}>
                  {nextUpBox.line3}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.statLabel}>Next up</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  None
                </Text>
                <Text style={styles.statSub} numberOfLines={1}>
                  Add an expiry/renewal date
                </Text>
              </>
            )}
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Next reminder</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {nextReminderBox.primary}
            </Text>
            {!!nextReminderBox.secondary && (
              <Text style={styles.statSub} numberOfLines={1}>
                {nextReminderBox.secondary}
              </Text>
            )}
          </View>
        </View>
      )}

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
      ) : showEmpty ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyHero}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={22} color={vars.ink} />
            </View>

            <Text style={styles.emptyTitle}>No bills yet</Text>
            <Text style={styles.emptyText}>Add your household bills to keep everything in sync.</Text>

            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => navigation.navigate("BillForm", { mode: "create" })}
              style={styles.emptyCta}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyCtaText}>Add bill</Text>
            </TouchableOpacity>

            <Text style={styles.emptyTip} numberOfLines={2}>
              Tip: set an expiry or renewal date to keep Next up accurate.
            </Text>
          </View>
        </View>
      ) : (
        <>
          {SortPill}
          <FlatList
            data={data}
            keyExtractor={(it: any) => it.id}
            renderItem={({ item }: any) => (item.id === "__add__" ? <AddTile /> : <BillTile item={item} />)}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          />
        </>
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
    marginBottom: 12,
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
    justifyContent: "center",
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: vars.inkMuted },
  statValue: { marginTop: 2, fontSize: 15, fontWeight: "900", color: vars.ink },
  statSub: { marginTop: 2, fontSize: 11, fontWeight: "700", color: vars.inkMuted },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  sortRow: { marginBottom: 12, alignItems: "flex-start" },
  sortPill: {
    flexDirection: "row",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderRadius: 999,
    padding: 3,
  },
  sortItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  sortItemActive: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: vars.border },
  sortText: { fontSize: 12, fontWeight: "800", color: vars.inkMuted },
  sortTextActive: { color: vars.ink },

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
  tileMeta: { marginTop: 4, fontSize: 11, fontWeight: "800", color: vars.inkMuted },

  tileRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  tileAmount: { fontSize: 14, fontWeight: "900", color: vars.ink },

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

  emptyWrap: { flex: 1, paddingTop: 10 },
  emptyHero: {
    backgroundColor: vars.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 18,
    shadowColor: "rgba(17, 24, 39, 0.10)",
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: vars.ink, marginBottom: 6 },
  emptyText: { fontSize: 13, fontWeight: "700", color: vars.inkMuted, marginBottom: 14 },
  emptyCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: vars.ink,
  },
  emptyCtaText: { fontSize: 13, fontWeight: "900", color: "#FFFFFF" },
  emptyTip: { marginTop: 14, fontSize: 12, fontWeight: "700", color: vars.inkMuted },
});
