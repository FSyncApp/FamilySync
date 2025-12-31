/** FS PATCH: Bills UI polish — tiles, stats boxes, add-tile */
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
      setLoadError(e?.message ?? "Failed to load bills.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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

  const nextReminderLabel = useMemo(() => {
    const withReminder = items
      .map((i: any) => i.reminderAt)
      .filter(Boolean)
      .map((d: string) => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());
    if (!withReminder.length) return "None set";
    return withReminder[0].toLocaleDateString();
  }, [items]);

  const renderItem = useCallback(
    ({ item }: { item: BillRow }) => {
      const provider = (item as any).provider ?? "";
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate("BillForm", { mode: "edit", billId: item.id })}
          style={styles.row}
        >
          <View style={styles.rowLeft}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
            {!!provider && (
              <Text style={styles.rowSub} numberOfLines={1}>{provider}</Text>
            )}
          </View>

          <View style={styles.rowRight}>
            <Text style={styles.rowAmount}>{formatGBP(item.amount)}</Text>
            <Ionicons name="chevron-forward" size={18} color={vars.inkMuted} style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  const showEmpty = !loading && items.length === 0 && !loadError;

  return (
    <View style={styles.screen}>
      <Text style={styles.descriptor} numberOfLines={1}>
        Keep your family’s bills synchronised.
      </Text>

      {!showEmpty && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total bills</Text>
            <Text style={styles.statValue}>{items.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Next reminder</Text>
            <Text style={styles.statValue}>{nextReminderLabel}</Text>
          </View>
        </View>
      )}

      {!!loadError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Couldn’t load bills</Text>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : showEmpty ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No bills yet</Text>
          <Text style={styles.emptyText}>
            Add your household bills to keep everything in sync.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <FlatList
            data={[...items, { id: "__add__", name: "" } as any]}
            keyExtractor={(it) => it.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) =>
              item.id === "__add__" ? (
                <TouchableOpacity
                  style={styles.addRow}
                  onPress={() => navigation.navigate("BillForm", { mode: "create" })}
                >
                  <Ionicons name="add-circle-outline" size={20} color={vars.inkMuted} />
                  <Text style={styles.addText}>Add bill</Text>
                </TouchableOpacity>
              ) : (
                renderItem({ item })
              )
            }
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        </View>
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

  card: {
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    overflow: "hidden",
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flex: 1, paddingRight: 10 },
  rowTitle: { fontSize: 14, fontWeight: "900", color: vars.ink },
  rowSub: { marginTop: 2, fontSize: 12, fontWeight: "700", color: vars.inkMuted },

  rowRight: { flexDirection: "row", alignItems: "center" },
  rowAmount: { fontSize: 14, fontWeight: "900", color: vars.ink },

  addRow: {
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { fontSize: 14, fontWeight: "900", color: vars.inkMuted },

  sep: { height: 1, backgroundColor: vars.border },

  emptyCard: {
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: vars.ink, marginBottom: 6 },
  emptyText: { fontSize: 13, fontWeight: "700", color: vars.inkMuted },

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
});
