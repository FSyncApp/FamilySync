import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { router } from "expo-router";

import { listBills, type BillRow } from "../../migration_src/client/data/billsStore";

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

function isExpiredBill(bill: any, now: Date) {
  const autoRenew = Boolean(bill?.auto_renew ?? false);
  const iso = autoRenew ? bill?.renewal_date : bill?.expiry_date;
  const d = parseISODateMaybe(iso);
  if (!d) return false;
  return d.getTime() < now.getTime();
}

function getEffectiveDueDate(bill: any, now: Date) {
  const autoRenew = Boolean(bill?.auto_renew ?? false);
  const iso = autoRenew ? bill?.renewal_date : bill?.expiry_date;
  const d = parseISODateMaybe(iso);
  if (!d) return null;
  return d;
}

function formatDueLine(now: Date, due?: Date | null) {
  if (!due) return "";
  const diff = daysBetweenUtc(now, due);
  if (!Number.isFinite(diff)) return "";
  if (diff < 0) return `Expired • ${formatDateShort(due)}`;
  if (diff === 0) return `Today • ${formatDateShort(due)}`;
  if (diff === 1) return `Tomorrow • ${formatDateShort(due)}`;
  if (diff <= 30) return `In ${diff} days • ${formatDateShort(due)}`;
  return formatDateShort(due);
}

function formatMoneyGeneric(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  try {
    return v.toLocaleString(undefined, { style: "currency", currency: "GBP" });
  } catch {
    return `£${v.toFixed(2)}`;
  }
}

export default function BillsIndexRoute() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<BillRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("next");

  const now = useMemo(() => new Date(), [items.length, sortMode, loading, refreshing]);

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

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const openCreate = useCallback(() => {
    router.push({ pathname: "/bills/form", params: { mode: "create" } });
  }, []);

  const openEdit = useCallback((billId: string) => {
    router.push({ pathname: "/bills/form", params: { mode: "edit", billId } });
  }, []);

  const itemsSorted = useMemo(() => {
    const base = [...items];

    if (sortMode === "az") {
      base.sort((a: any, b: any) =>
        String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" })
      );
      return base;
    }

    base.sort((a: any, b: any) => {
      const aExpired = isExpiredBill(a, now);
      const bExpired = isExpiredBill(b, now);
      if (aExpired !== bExpired) return aExpired ? 1 : -1;

      const da = getEffectiveDueDate(a, now);
      const db = getEffectiveDueDate(b, now);
      const ta = da ? da.getTime() : Number.POSITIVE_INFINITY;
      const tb = db ? db.getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;

      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" });
    });

    return base;
  }, [items, now, sortMode]);

  const header = useMemo(() => {
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>Bills</Text>
          <TouchableOpacity onPress={openCreate} activeOpacity={0.85} style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

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

        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Couldn’t load bills</Text>
            <Text style={styles.errorBody}>{loadError}</Text>
            <TouchableOpacity activeOpacity={0.85} onPress={load} style={styles.errorCta}>
              <Text style={styles.errorCtaText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }, [load, loadError, openCreate, sortMode]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const expired = isExpiredBill(item, now);
      const due = getEffectiveDueDate(item, now);
      const dueLine = formatDueLine(now, due);

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => openEdit(String(item?.id))}
          style={[styles.tile, expired && styles.tileExpired]}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.tileTitle, expired && styles.tileTitleExpired]} numberOfLines={1}>
              {String(item?.name ?? "")}
            </Text>

            {!!dueLine && (
              <Text style={[styles.tileSub, expired && styles.tileSubExpired]} numberOfLines={1}>
                {dueLine}
              </Text>
            )}
          </View>

          <View style={styles.tileRight}>
            <Text style={[styles.tileAmount, expired && styles.tileAmountExpired]} numberOfLines={1}>
              {formatMoneyGeneric(Number(item?.amount ?? 0))}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={expired ? vars.inkFaint : vars.inkMuted} />
          </View>
        </TouchableOpacity>
      );
    },
    [now, openEdit]
  );

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  const showEmpty = !loadError && itemsSorted.length === 0;

  return (
    <View style={styles.screen}>
      {showEmpty ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconBig}>
            <Ionicons name="receipt-outline" size={34} color={vars.ink} />
          </View>
          <Text style={styles.emptyTitle}>No bills yet</Text>
          <Text style={styles.emptyBody}>Add bills to keep everything in sync.</Text>

          <TouchableOpacity activeOpacity={0.85} onPress={openCreate} style={styles.emptyCta}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.emptyCtaText}>Add bill</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={itemsSorted}
          keyExtractor={(it) => String((it as any).id)}
          renderItem={renderItem}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 18 }}
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
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vars.bg, padding: 14 },
  center: { alignItems: "center", justifyContent: "center" },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  h1: { fontSize: 20, fontWeight: "900", color: vars.ink },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: vars.ink,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },

  sortPill: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: vars.card,
    alignSelf: "center",
  },
  sortItem: { paddingVertical: 8, paddingHorizontal: 12 },
  sortItemActive: { backgroundColor: vars.ink },
  sortText: { fontSize: 12, fontWeight: "900", color: vars.inkMuted },
  sortTextActive: { color: "#FFFFFF" },

  tile: {
    backgroundColor: vars.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  tileExpired: { opacity: 0.55 },
  tileTitle: { fontSize: 15, fontWeight: "900", color: vars.ink },
  tileTitleExpired: { color: vars.inkMuted },
  tileSub: { marginTop: 6, fontSize: 12, fontWeight: "800", color: vars.inkMuted },
  tileSubExpired: { color: vars.inkMuted },
  tileRight: { alignItems: "flex-end" },
  tileAmount: { fontSize: 14, fontWeight: "900", color: vars.ink },
  tileAmountExpired: { color: vars.inkMuted },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 30 },
  emptyIconBig: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    alignItems: "center",
    justifyContent: "center",
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

  errorBox: {
    marginTop: 12,
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
