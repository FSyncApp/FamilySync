/** FS PATCH: Bills list — clean rebuild (due sorting + stats + expired labels + empty state hero) */
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

function parseISODateMaybe(value: any): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function daysBetweenUtc(a?: Date | null, b?: Date | null) {
  if (!a || !b) return Number.NaN;
  const a0 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const b0 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((b0 - a0) / (1000 * 60 * 60 * 24));
}

function formatMoneyGeneric(amount: number) {
  // Intentionally currency-agnostic (no symbol).
  const n = Number.isFinite(amount) ? amount : 0;
  const v = Math.round(n * 100) / 100;
  return v.toFixed(2);
}

function getBillPrimaryDate(item: any): { kind: "renews" | "expires"; date: Date } | null {
  const auto = Boolean(item?.auto_renew ?? item?.autoRenew ?? false);
  const renewal = parseISODateMaybe(item?.renewal_date ?? item?.renewalDate);
  const expiry = parseISODateMaybe(item?.expiry_date ?? item?.expiryDate);

  if (auto && renewal) return { kind: "renews", date: renewal };
  if (!auto && expiry) return { kind: "expires", date: expiry };

  // Fallbacks if flag is missing
  if (renewal) return { kind: "renews", date: renewal };
  if (expiry) return { kind: "expires", date: expiry };

  return null;
}

function getEffectiveDueDate(item: any): Date | null {
  // "Next up" = primary due date (expiry/renewal). Reminder is secondary and shown separately.
  return getBillPrimaryDate(item)?.date ?? null;
}

function isExpiredBill(item: any, now: Date): boolean {
  const due = getEffectiveDueDate(item);
  const diff = daysBetweenUtc(now, due);
  if (!Number.isFinite(diff)) return false;
  return diff < 0;
}

function formatDueLine(now: Date, due?: Date | null) {
  if (!due) return "";
  const diff = daysBetweenUtc(now, due);
  if (!Number.isFinite(diff)) return "";
  if (diff < 0) return `Expired on ${formatDateShort(due)}`;
  if (diff <= 30) {
    if (diff === 0) return "Due today";
    if (diff === 1) return "Due in 1 day";
    return `Due in ${diff} days`;
  }
  return `Due ${formatDateShort(due)}`;
}

function formatDuePrimary(now: Date, due?: Date | null) {
  if (!due) return { primary: "None", secondary: "" };
  const diff = daysBetweenUtc(now, due);
  if (!Number.isFinite(diff)) return { primary: "None", secondary: "" };
  if (diff < 0) return { primary: `Expired`, secondary: formatDateShort(due) };
  if (diff === 0) return { primary: "Today", secondary: formatDateShort(due) };
  if (diff === 1) return { primary: "In 1 day", secondary: formatDateShort(due) };
  if (diff <= 30) return { primary: `In ${diff} days`, secondary: formatDateShort(due) };
  return { primary: formatDateShort(due), secondary: "" };
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

  const showEmpty = !loading && items.length === 0 && !loadError;
  const now = useMemo(() => new Date(), [items.length, sortMode, loading, refreshing]);

  const itemsSorted = useMemo(() => {
    const base = [...items];

    if (sortMode === "az") {
      base.sort((a: any, b: any) =>
        String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" })
      );
      return base;
    }

    base.sort((a: any, b: any) => {
      // Push expired items to the bottom of "Next up"
      const aExpired = isExpiredBill(a, now);
      const bExpired = isExpiredBill(b, now);
      if (aExpired !== bExpired) return aExpired ? 1 : -1;

      const da = getEffectiveDueDate(a);
      const db = getEffectiveDueDate(b);
      const ta = da ? da.getTime() : Number.POSITIVE_INFINITY;
      const tb = db ? db.getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;

      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" });
    });

    return base;
  }, [items, now, sortMode]);

  const nextUp = useMemo(() => {
    const upcoming = items
      .map((it: any) => ({ it, due: getEffectiveDueDate(it) }))
      .filter((x) => !!x.due && !Number.isNaN((x.due as Date).getTime()))
      .sort((a, b) => (a.due as Date).getTime() - (b.due as Date).getTime());

    // Prefer not-expired
    const firstNotExpired = upcoming.find((x) => !isExpiredBill(x.it, now));
    const pick = firstNotExpired ?? upcoming[0];

    if (!pick) return { line2: "None", line3: "", due: null as Date | null };

    const due = pick.due as Date;
    const diff = daysBetweenUtc(now, due);
    const line3 =
      Number.isFinite(diff) && diff >= 0 && diff <= 30
        ? (diff === 0 ? "Due today" : diff === 1 ? "Due in 1 day" : `Due in ${diff} days`)
        : formatDateShort(due);

    return { line2: String((pick.it as any).name ?? "Bill"), line3, due };
  }, [items, now]);

  const stats = useMemo(() => {
    const total = items.length;

    const nextDue = items
      .map((it: any) => ({ it, due: getEffectiveDueDate(it) }))
      .filter((x) => !!x.due && !Number.isNaN((x.due as Date).getTime()))
      .filter((x) => !isExpiredBill(x.it, now))
      .sort((a, b) => (a.due as Date).getTime() - (b.due as Date).getTime())[0];

    const due = nextDue?.due ?? null;
    const label = nextDue?.it ? String((nextDue.it as any).name ?? "") : "";

    return { total, due, label };
  }, [items, now]);

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
          {sortMode === "next" ? "Sorted by due date" : "Sorted alphabetically"}
        </Text>
      </View>
    );
  }, [loading, showEmpty, sortMode]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      if (item.id === "__empty__") {
        return (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBig}>
              <Ionicons name="receipt-outline" size={34} color={vars.ink} />
            </View>

            <Text style={styles.emptyTitle}>No bills yet</Text>
            <Text style={styles.emptyBody}>Add bills to keep everything in sync.</Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate("BillForm", { mode: "create" })}
              style={styles.emptyCta}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyCtaText}>Add bill</Text>
            </TouchableOpacity>

            <Text style={styles.emptyTip} numberOfLines={2}>
              Tip: add both renewals and one-off expiries.
            </Text>
          </View>
        );
      }

      if (item.id === "__add__") {
        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate("BillForm", { mode: "create" })}
            style={styles.addTile}
          >
            <View style={styles.addIcon}>
              <Ionicons name="add" size={18} color={vars.ink} />
            </View>
            <Text style={styles.addTileText}>Add bill</Text>
          </TouchableOpacity>
        );
      }

      const provider = String((item as any).provider ?? "").trim();
      const frequency = String((item as any).frequency ?? "").trim();
      const primary = getBillPrimaryDate(item);
      const due = primary?.date ?? null;

      const expired = isExpiredBill(item, now);

      const kindLabel = primary ? (primary.kind === "renews" ? "Renews" : "Expires") : "";
      const kindLine = due && kindLabel ? `${kindLabel} ${formatDateShort(due)}` : "";

      const dueLine = formatDueLine(now, due);

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate("BillForm", { mode: "edit", billId: (item as any).id })}
          style={[styles.tile, expired && styles.tileExpired]}
        >
          <View style={styles.tileTop}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.tileTitle, expired && styles.tileTitleExpired]} numberOfLines={1}>
                {(item as any).name}
              </Text>

              {!!provider && (
                <Text style={[styles.tileSub, expired && styles.tileSubExpired]} numberOfLines={1}>
                  {provider}
                </Text>
              )}

              {!!frequency && (
                <Text style={[styles.tileMeta, expired && styles.tileSubExpired]} numberOfLines={1}>
                  {frequency}
                </Text>
              )}

              {!!kindLine && (
                <Text style={[styles.tileMeta2, expired && styles.tileSubExpired]} numberOfLines={1}>
                  {kindLine}
                </Text>
              )}

              {!!dueLine && (
                <Text style={[styles.tileDue, expired && styles.tileDueExpired]} numberOfLines={1}>
                  {dueLine}
                </Text>
              )}
            </View>

            <View style={styles.tileRight}>
              <Text style={[styles.tileAmount, expired && styles.tileAmountExpired]} numberOfLines={1}>
                {formatMoneyGeneric(Number((item as any).amount ?? 0))}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={expired ? vars.inkFaint : vars.inkMuted} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, now]
  );

  const header = useMemo(() => {
    if (loading) return null;

    const nextDueParts = formatDuePrimary(now, stats.due);
    const nextDueLabel = stats.label ? stats.label : "—";

    return (
      <View style={{ marginBottom: 12 }}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statPrimary}>{stats.total}</Text>
            <Text style={styles.statSecondary}>bills</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Next due</Text>
            <Text style={styles.statPrimary}>{nextDueParts.primary}</Text>
            <Text style={styles.statSecondary} numberOfLines={1}>
              {nextDueLabel}
            </Text>
          </View>
        </View>

        {SortPill}

        {!showEmpty && (
          <View style={styles.nextUpCard}>
            <Text style={styles.nextUpLine1}>Next up</Text>
            <Text style={styles.nextUpLine2} numberOfLines={1}>
              {nextUp.line2}
            </Text>
            <Text style={styles.nextUpLine3} numberOfLines={1}>
              {nextUp.line3}
            </Text>
          </View>
        )}
      </View>
    );
  }, [SortPill, loading, now, nextUp.line2, nextUp.line3, showEmpty, stats.due, stats.label, stats.total]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn’t load bills</Text>
          <Text style={styles.errorBody}>{loadError}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={load} style={styles.errorCta}>
            <Text style={styles.errorCtaText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it) => String((it as any).id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 18 }}
          ListHeaderComponent={header}
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
  inkFaint: "#9CA3AF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  shadow: "rgba(17, 24, 39, 0.08)",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vars.bg, padding: 14 },
  center: { alignItems: "center", justifyContent: "center" },

  headerAdd: { paddingHorizontal: 12, paddingVertical: 6 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: vars.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: vars.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statLabel: { fontSize: 12, fontWeight: "900", color: vars.inkMuted },
  statPrimary: { marginTop: 6, fontSize: 18, fontWeight: "900", color: vars.ink },
  statSecondary: { marginTop: 2, fontSize: 12, fontWeight: "800", color: vars.inkMuted },

  sortRow: { marginTop: 6, marginBottom: 10 },
  sortPill: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: vars.card,
    alignSelf: "flex-start",
  },
  sortItem: { paddingVertical: 8, paddingHorizontal: 12 },
  sortItemActive: { backgroundColor: vars.ink },
  sortText: { fontSize: 12, fontWeight: "900", color: vars.inkMuted },
  sortTextActive: { color: "#FFFFFF" },
  sortHint: { marginTop: 6, fontSize: 12, fontWeight: "700", color: vars.inkMuted },

  nextUpCard: {
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 14,
    shadowColor: vars.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  nextUpLine1: { fontSize: 12, fontWeight: "900", color: vars.inkMuted },
  nextUpLine2: { marginTop: 6, fontSize: 16, fontWeight: "900", color: vars.ink },
  nextUpLine3: { marginTop: 4, fontSize: 13, fontWeight: "800", color: vars.inkMuted },

  tile: {
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 12,
    marginBottom: 10,
    shadowColor: vars.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  tileExpired: { opacity: 0.6 },
  tileTop: { flexDirection: "row", alignItems: "center" },
  tileTitle: { fontSize: 15, fontWeight: "900", color: vars.ink },
  tileTitleExpired: { color: vars.inkMuted },
  tileSub: { marginTop: 4, fontSize: 12, fontWeight: "800", color: vars.inkMuted },
  tileSubExpired: { color: vars.inkFaint },
  tileMeta: { marginTop: 2, fontSize: 12, fontWeight: "800", color: vars.inkMuted },
  tileMeta2: { marginTop: 2, fontSize: 12, fontWeight: "800", color: vars.inkMuted },
  tileDue: { marginTop: 6, fontSize: 12, fontWeight: "900", color: vars.inkMuted },
  tileDueExpired: { color: vars.inkFaint },

  tileRight: { alignItems: "flex-end", justifyContent: "center" },
  tileAmount: { fontSize: 14, fontWeight: "900", color: vars.ink, marginBottom: 2 },
  tileAmountExpired: { color: vars.inkMuted },

  addTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 12,
    marginBottom: 10,
  },
  addIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: vars.border,
    alignItems: "center",
    justifyContent: "center",
  },
  addTileText: { fontSize: 14, fontWeight: "900", color: vars.ink },

  emptyWrap: { flex: 1, alignItems: "center", paddingTop: 26, paddingBottom: 26 },
  emptyIconBig: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: vars.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  emptyTitle: { marginTop: 14, fontSize: 20, fontWeight: "900", color: vars.ink },
  emptyBody: { marginTop: 8, fontSize: 14, fontWeight: "700", color: vars.inkMuted, lineHeight: 20, textAlign: "center" },
  emptyCta: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vars.ink,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  emptyCtaText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
  emptyTip: { marginTop: 12, fontSize: 12, fontWeight: "700", color: vars.inkMuted, textAlign: "center" },

  errorBox: {
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 14,
  },
  errorTitle: { fontSize: 16, fontWeight: "900", color: vars.ink },
  errorBody: { marginTop: 6, fontSize: 13, fontWeight: "700", color: vars.inkMuted, lineHeight: 18 },
  errorCta: { marginTop: 12, backgroundColor: vars.ink, borderRadius: 14, paddingVertical: 10, alignItems: "center" },
  errorCtaText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
});
