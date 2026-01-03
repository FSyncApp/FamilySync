import React, { useCallback, useLayoutEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from "react-native";
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

function formatUKDateFromISO(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

export default function BillsListScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onAdd = useCallback(() => navigation.navigate("BillForm", { mode: "create" }), [navigation]);

  // Use the native stack header (compact) instead of an in-screen header.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Bills",
      headerRight: () => (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onAdd}
          activeOpacity={0.85}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Ionicons name="add" size={22} color={vars.ink} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, onAdd]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listBills();
      setBills(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load bills");
      setBills([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const renderItem = ({ item, index }: { item: BillRow; index: number }) => {
    const safeName = String(item?.name ?? "").trim() || "Untitled bill";
    const safeAmount = Number(item?.amount ?? 0);
    const created = formatUKDateFromISO(item?.created_at);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.row, index === 0 && styles.rowFirst]}
        onPress={() => navigation.navigate("BillForm", { mode: "edit", billId: item.id })}
      >
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {safeName}
          </Text>

          {!!created && (
            <Text style={styles.rowSub} numberOfLines={1}>
              {created}
            </Text>
          )}
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.amount}>{formatGBP(safeAmount)}</Text>
          <Ionicons name="chevron-forward" size={16} color={vars.inkMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.card}>
            {bills.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No bills yet</Text>
                <Text style={styles.emptySub}>Tap + to add your first bill.</Text>
              </View>
            ) : (
              <FlatList
                data={bills}
                keyExtractor={(b) => b.id}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              />
            )}
          </View>
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
  shadow: "rgba(17, 24, 39, 0.08)",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vars.bg, padding: 16 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  errorBox: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  errorText: { color: "#9F1239", fontWeight: "700", fontSize: 13 },

  card: {
    flex: 1,
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    overflow: "hidden",
    shadowColor: vars.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },

  empty: { padding: 16 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: vars.ink },
  emptySub: { marginTop: 6, fontSize: 13, fontWeight: "600", color: vars.inkMuted, lineHeight: 18 },

  // Compact rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: vars.border,
  },
  rowFirst: { borderTopWidth: 0 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, lineHeight: 18, fontWeight: "800", color: vars.ink },
  rowSub: { marginTop: 2, fontSize: 12, lineHeight: 15, fontWeight: "700", color: vars.inkMuted },
  rowRight: { marginLeft: 10, alignItems: "center", flexDirection: "row", gap: 8 },
  amount: { fontSize: 13, lineHeight: 16, fontWeight: "900", color: vars.ink },
});
