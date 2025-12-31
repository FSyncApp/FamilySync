/** FS PATCH: Bills UI polish — per-bill tiles + stats + add-tile (UI-only) */
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

function formatGBP(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  const v = Math.round(n * 100) / 100;
  return `£${v.toFixed(2)}`;
}

function formatDateShort(d: Date) {
  // Locale-aware, short + readable
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export default function BillsListScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<BillRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await listBills();
      setItems(Array.isArray(next) ? next : []);
    } catch (e: any) {
      // Don't wipe existing bills on transient errors
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

  const { nextReminderLabel, nextReminderRaw } = useMemo(() => {
    const reminderDates = items
      .map((i: any) => i.reminderAt)
      .filter(Boolean)
      .map((s: string) => new Date(s))
      .filter((d: Date) => !Number.isNaN(d.getTime()))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    if (!reminderDates.length) return { nextReminderLabel: "None set", nextReminderRaw: null as Date | null };

    const d = reminderDates[0];
    return { nextReminderLabel: formatDateShort(d), nextReminderRaw: d };
  }, [items]);

  const showEmpty = !loading && items.length === 0 && !loadError;

  const data = useMemo(() => {
    if (loading || showEmpty) return [];
    return [...items, { id: "__add__", name: "" } as any];
  }, [items, loading, showEmpty]);

  const BillTile = useCallback(
    ({ item }: { item: BillRow }) => {
      const provider = (item as any).provider ?? "";
      const frequency = (item as any).frequency ?? "";
      const reminderAt = (item as any).reminderAt ? new Date((item as any).reminderAt) : null;
      const hasReminder = reminderAt && !Number.isNaN(reminderAt.getTime());

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate("BillForm", { mode: "edit", billId: item.id })}
          style={styles.tile}
        >
          <View style={styles.tileTop}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.tileTitle} numberOfLines={1}>
                {item.name}
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
            </View>

            <View style={styles.tileRight}>
              <Text style={styles.tileAmount} numberOfLines={1}>
                {formatGBP(item.amount)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={vars.inkMuted} />
            </View>
          </View>

          {hasReminder && (
            <View style={styles.reminderPill}>
              <Ionicons name="alarm-outline" size={14} color={vars.inkMuted} />
              <Text style={styles.reminderText} numberOfLines={1}>
                Reminder {formatDateShort(reminderAt!)}
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
            <Text style={styles.statLabel}>Next reminder</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {nextReminderLabel}
            </Text>
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
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it: any) => it.id}
          renderItem={({ item }: any) => (item.id === "__add__" ? <AddTile /> : <BillTile item={item} />)}
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
    alignItems: "center",
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: vars.inkMuted },
  statValue: { marginTop: 2, fontSize: 16, fontWeight: "900", color: vars.ink },

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

  // Individual bill "tile" (separate cards, slightly smaller than before)
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
