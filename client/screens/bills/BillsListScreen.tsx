/** FS PATCH: Bills list UI — Next up/A–Z sort + next reminder (In X days) + tile date badges + empty add-card (UI-only) */
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

    base.sort((a: any, b: any) => {
      const ra = getReminderDate(a);
      const rb = getReminderDate(b);
      const ta = ra ? ra.getTime() : Number.POSITIVE_INFINITY;
      const tb = rb ? rb.getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;

      const da = getBillPrimaryDate(a)?.date;
      const db = getBillPrimaryDate(b)?.date;
      const tda = da ? da.getTime() : Number.POSITIVE_INFINITY;
      const tdb = db ? db.getTime() : Number.POSITIVE_INFINITY;
      if (tda !== tdb) return tda - tdb;

      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" });
    });

    return base;
  }, [items, sortMode]);

  const nextReminder = useMemo(() => {
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
          {sortMode === "next" ? "Sorted by next reminder" : "Sorted alphabetically"}
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

      const dateLabel = primaryDate
        ? `${primaryDate.kind === "renews" ? "Renews" : "Expires"} ${formatDateShort(primaryDate.date)}`
        : "";

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
            <View style={styles.badgeRow}>
              <View style={styles.badgePill}>
                <Ionicons name="alarm-outline" size={14} color={vars.inkMuted} />
                <Text style={styles.badgeText} numberOfLines={1}>
                  Reminder on
                </Text>
              </View>

              <View style={styles.badgePillLight}>
                <Text style={styles.badgeTextLight} numberOfLines={1}>
                  {formatDateShort(reminderAt)}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  const AddTile = useCallback(
    ({ variant }: { variant: "inline" | "empty" }) => (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("BillForm", { mode: "create" })}
        style={[styles.tile, styles.addTile, variant === "empty" && styles.addTileEmpty]}
      >
        <Ionicons name="add-circle-outline" size={22} color={vars.inkMuted} />
        <View style={{ flex: 1 }}>
          <Text style={styles.addTileText}>Add bill</Text>
          {variant === "empty" && (
            <Text style={styles.addTileSub} numberOfLines={2}>
              Add your household bills to keep everything in sync.
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.descriptor} numberOfLines={1}>
        Keep your family’s bills synchronised.  •  FS PATCH v2
      </Text>

      {!showEmpty && !loading && (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total bills</Text>
              <Text style={styles.statValue}>{items.length}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Next reminder</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {nextReminder.primary}
              </Text>
              {!!nextReminder.secondary && (
                <Text style={styles.statSubValue} numberOfLines={1}>
                  {nextReminder.secondary}
                </Text>
              )}
            </View>
          </View>

          {SortPill}
        </>
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
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it: any) => it.id}
          renderItem={({ item }: any) => {
            if (item.id === "__add__") return <AddTile variant="inline" />;
            if (item.id === "__empty__") return <AddTile variant="empty" />;
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

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
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
  statSubValue: { marginTop: 1, fontSize: 12, fontWeight: "800", color: vars.inkMuted },

  sortRow: { marginBottom: 12, alignItems: "center" },
  sortPill: {
    flexDirection: "row",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderRadius: 999,
    padding: 3,
  },
  sortItem: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  sortItemActive: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: vars.border },
  sortText: { fontSize: 12, fontWeight: "900", color: vars.inkMuted },
  sortTextActive: { color: vars.ink },
  sortHint: { marginTop: 6, fontSize: 12, fontWeight: "700", color: vars.inkMuted },

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
  tileMeta2: { marginTop: 2, fontSize: 11, fontWeight: "800", color: vars.inkMuted },

  tileRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  tileAmount: { fontSize: 14, fontWeight: "900", color: vars.ink },

  badgeRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badgePill: {
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
  badgeText: { fontSize: 11, fontWeight: "800", color: vars.inkMuted },
  badgePillLight: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
  },
  badgeTextLight: { fontSize: 11, fontWeight: "900", color: vars.ink },

  addTile: {
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 14,
  },
  addTileEmpty: { paddingVertical: 18, paddingHorizontal: 16 },
  addTileText: { fontSize: 14, fontWeight: "900", color: vars.inkMuted },
  addTileSub: { marginTop: 4, fontSize: 12, fontWeight: "700", color: vars.inkMuted },

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
