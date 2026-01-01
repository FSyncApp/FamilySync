/** FS PATCH: Bills list — expired labels + greyed tiles + keep v2 sorting + empty state Option A (UI-only) */
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

function getEffectiveDueDate(item: any): Date | null {
  // “Next up” and sorting: primary due date (expiry/renewal). Reminder is secondary.
  const primary = getBillPrimaryDate(item);
  return primary?.date ?? null;
}


function isExpiredBill(item: any, now: Date): boolean {
  const primary = getBillPrimaryDate(item);
  if (!primary || primary.kind !== "expires") return false;
  const due = primary.date;
  return daysBetweenUtc(now, due) < 0;
}

function getDueSortKey(item: any, now: Date): number {
  const due = getEffectiveDueDate(item);
  if (!due) return Number.POSITIVE_INFINITY;

  // Push expired items to the bottom of "Next up"
  if (isExpiredBill(item, now)) return Number.POSITIVE_INFINITY;

  return due.getTime();
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

function formatMoneyGeneric(amount: number) {
  // Currency-agnostic (no symbol).
  const n = Number.isFinite(amount) ? amount : 0;
  const v = Math.round(n * 100) / 100;
  return v.toFixed(2);
}

function formatDueLine(
  now: Date,
  due: Date,
  opts?: { kind?: "renews" | "expires" }
) {
  const diff = daysBetweenUtc(now, due);

  // Special-case: an expiry date in the past is "Expired on …" (not "Due/Overdue").
  if (opts?.kind === "expires" && diff < 0) {
    return `Expired on ${formatDateShort(due)}`;
  }

  if (diff === 0) return "Today";
  if (diff === 1) return "In 1 day";
  if (diff > 1 && diff < 30) return `In ${diff} days`;
  if (diff === -1) return "Overdue by 1 day";
  if (diff < -1) return `Overdue by ${Math.abs(diff)} days`;

  // >= 30 days away: show the date
  return formatDateShort(due);
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
  const now = useMemo(() => new Date(), [items.length]);

  const itemsSorted = useMemo(() => {
    const base = [...items];

    if (sortMode === "az") {
      base.sort((a: any, b: any) =>
        String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" })
      );
      return base;
    }

    base.sort((a: any, b: any) => {
      const ka = getDueSortKey(a, now);
      const kb = getDueSortKey(b, now);
      if (ka !== kb) return ka - kb;

      // Secondary: reminder date (if any)
      const ra = getReminderDate(a);
      const rb = getReminderDate(b);
      const ta = ra ? ra.getTime() : Number.POSITIVE_INFINITY;
      const tb = rb ? rb.getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;

      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" });
    });

    return base;
  }, [items, sortMode, now]);

  const nextUp = useMemo(() => {
    if (!items.length) return null;

    // Choose the soonest *non-expired* due date (expiry/renewal). Expired items are shown lower in the list.
    const candidates = items
      .map((it: any) => {
        const primary = getBillPrimaryDate(it);
        const due = getEffectiveDueDate(it);
        const sortKey = getDueSortKey(it, now);
        return primary && due && Number.isFinite(sortKey)
          ? { id: it.id, name: it.name, kind: primary.kind, due, sortKey }
          : null;
      })
      .filter(Boolean) as { id: string; name: string; kind: "renews" | "expires"; due: Date; sortKey: number }[];

    if (!candidates.length) return null;

    candidates.sort((a, b) => a.sortKey - b.sortKey);
    return candidates[0];
  }, [items, now]);

  const nextUpLine3 = useMemo(() => {
    if (!nextUp) return null;
    return formatDueLine(now, nextUp.due, { kind: nextUp.kind });
  }, [nextUp, now]);

  const nextReminderBox = useMemo(() => {
    const candidates = items
      .map((i: any) => getReminderDate(i))
      .filter(Boolean) as Date[];

    const upcoming = candidates
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (!upcoming.length) return { primary: "None set", secondary: "" };

    const d = upcoming[0];
    const primary = formatDueLine(now, d);
    const secondary = formatDateShort(d);
    return primary === secondary ? { primary, secondary: "" } : { primary, secondary };
  }, [items, now]);

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

  const data = useMemo(() => {
    if (loading) return [];
    if (showEmpty) return [{ id: "__empty__", name: "" } as any];
    return [...itemsSorted, { id: "__add__", name: "" } as any];
  }, [itemsSorted, loading, showEmpty]);

  const BillTile = useCallback(
    ({ item }: { item: BillRow }) => {
      const provider = (item as any).provider ?? "";
      const frequency = (item as any).frequency ?? "";
      const primary = getBillPrimaryDate(item as any);
      const due = getEffectiveDueDate(item as any);
      const reminder = getReminderDate(item as any);
      const expired = isExpiredBill(item as any, now);

      const dueLabel =
        primary && due
          ? (expired ? "" : `${primary.kind === "renews" ? "Renews" : "Expires"} ${formatDateShort(due)}`)
          : due
            ? formatDateShort(due)
            : "";

      const dueLine = due ? formatDueLine(now, due, { kind: primary?.kind }) : "";
      const reminderLine = reminder ? formatDueLine(now, reminder) : "";

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate("BillForm", { mode: "edit", billId: (item as any).id })}
          style={[styles.tile, expired && styles.tileExpired]}
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

              {!!dueLabel && (
                <Text style={styles.tileMeta2} numberOfLines={1}>
                  {dueLabel}
                </Text>
              )}
            </View>

            <View style={styles.tileRight}>
              <Text style={styles.tileAmount} numberOfLines={1}>
                {formatMoneyGeneric((item as any).amount)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={vars.inkMuted} />
            </View>
          </View>

          {!!dueLine && (
            <View style={[styles.duePill, expired && styles.duePillExpired]}>
              <Ionicons name="calendar-outline" size={14} color={vars.inkMuted} />
              <Text style={styles.dueText} numberOfLines={1}>
                Due {dueLine}
              </Text>
            </View>
          )}

          {!!reminderLine && (
            <View style={styles.reminderPill}>
              <Ionicons name="alarm-outline" size={14} color={vars.inkMuted} />
              <Text style={styles.reminderText} numberOfLines={1}>
                Reminder {reminderLine}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [navigation, now]
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

  const EmptyState = useCallback(() => {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconBadge}>
          <Ionicons name="receipt-outline" size={44} color={vars.ink} />
        </View>

        <Text style={styles.emptyTitle}>No bills yet</Text>
        <Text style={styles.emptyBody}>Add your household bills to keep everything in sync.</Text>

        <View style={styles.emptyBullets}>
          <View style={styles.emptyBulletRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={vars.inkMuted} />
            <Text style={styles.emptyBulletText}>Track renewals and expiries</Text>
          </View>
          <View style={styles.emptyBulletRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={vars.inkMuted} />
            <Text style={styles.emptyBulletText}>Set reminders before due dates</Text>
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
          You can edit bills later and toggle auto-renew any time.
        </Text>
      </View>
    );
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <Text style={styles.descriptor} numberOfLines={1}>
        Keep your family’s bills synchronised.
      </Text>

      {!!loadError && (
        <View style={styles.errorCard}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="alert-circle-outline" size={18} color={vars.inkMuted} />
            <View style={{ width: 10 }} />
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
        <EmptyState />
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Next up</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {nextUp ? nextUp.name : "—"}
              </Text>
              <Text style={styles.statSub} numberOfLines={1}>
                {nextUpLine3 ?? "—"}
              </Text>
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
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "700",
    color: vars.inkMuted,
    textAlign: "center",
  },

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

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: vars.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: vars.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statLabel: { fontSize: 11, fontWeight: "800", color: vars.inkMuted },
  statValue: { marginTop: 4, fontSize: 14, fontWeight: "900", color: vars.ink },
  statSub: { marginTop: 2, fontSize: 12, fontWeight: "800", color: vars.inkMuted },

  sortRow: { marginBottom: 10 },
  sortPill: {
    flexDirection: "row",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderRadius: 999,
    padding: 4,
    alignSelf: "center",
  },
  sortItem: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  sortItemActive: { backgroundColor: vars.card, borderWidth: 1, borderColor: vars.border },
  sortText: { fontSize: 12, fontWeight: "900", color: vars.inkMuted },
  sortTextActive: { color: vars.ink },
  sortHint: { marginTop: 6, fontSize: 11, fontWeight: "700", color: vars.inkMuted, textAlign: "center" },

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
  tileExpired: {
    opacity: 0.55,
  },
  tileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileTitle: { fontSize: 14, fontWeight: "900", color: vars.ink },
  tileSub: { marginTop: 3, fontSize: 12, fontWeight: "700", color: vars.inkMuted },
  tileMeta: { marginTop: 2, fontSize: 11, fontWeight: "700", color: vars.inkMuted },
  tileMeta2: { marginTop: 6, fontSize: 12, fontWeight: "800", color: vars.inkMuted },

  tileRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  tileAmount: { fontSize: 14, fontWeight: "900", color: vars.ink },

  duePill: {
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
    backgroundColor: "rgba(17,24,39,0.02)",
  },
  duePillExpired: {
    backgroundColor: vars.bgSoft,
    borderColor: vars.line,
  },
  dueText: { fontSize: 11, fontWeight: "800", color: vars.inkMuted },
  dueTextExpired: {
    color: vars.inkMuted,
  },

  reminderPill: {
    marginTop: 8,
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

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  emptyIconBadge: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 22, fontWeight: "900", color: vars.ink, textAlign: "center" },
  emptyBody: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: vars.inkMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBullets: { marginTop: 16, alignSelf: "stretch", maxWidth: 360 },
  emptyBulletRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  emptyBulletText: { fontSize: 13, fontWeight: "800", color: vars.ink, flex: 1 },

  emptyCta: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: vars.ink,
    minWidth: 220,
  },
  emptyCtaText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
  emptyTip: { marginTop: 14, fontSize: 12, fontWeight: "700", color: vars.inkMuted, textAlign: "center" },

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