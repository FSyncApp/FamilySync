/** FS PATCH MARKER: Bills v0 UX cleanup (list) */
import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { BillsStackParamList } from "../../navigation/BillsStack";
import { listBills, type BillRow } from "../../data/billsStore";

type Nav = NativeStackNavigationProp<BillsStackParamList>;

function formatGBP(amount: number) {
  const v = Math.round(amount * 100) / 100;
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

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listBills();
      setBills(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load bills");
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

  const onAdd = () => navigation.navigate("BillForm", { mode: "create" });

  const renderItem = ({ item, index }: { item: BillRow; index: number }) => {
    const date = formatUKDateFromISO(item.created_at);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.row, index === 0 && styles.rowFirst]}
        onPress={() => navigation.navigate("BillForm", { mode: "edit", billId: item.id })}
      >
        <View style={styles.rowIcon}>
          <Ionicons name="receipt-outline" size={18} color={vars.inkMuted} />
        </View>

        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.name}
          </Text>
          {!!date && (
            <Text style={styles.rowSub} numberOfLines={1}>
              Added {date}
            </Text>
          )}
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.amount}>{formatGBP(item.amount)}</Text>
          <Ionicons name="chevron-forward" size={16} color={vars.inkMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Bills</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={onAdd}>
          <Ionicons name="add" size={18} color={vars.ink} />
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>

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
                <Text style={styles.emptySub}>Add your first bill to start tracking renewals later.</Text>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "800", color: vars.ink },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addText: { fontSize: 14, fontWeight: "700", color: vars.ink },

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

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: vars.border,
  },
  rowFirst: { borderTopWidth: 0 },
  rowIcon: { width: 26, alignItems: "center", marginRight: 10 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, lineHeight: 18, fontWeight: "800", color: vars.ink },
  rowSub: { marginTop: 2, fontSize: 12, lineHeight: 15, fontWeight: "700", color: vars.inkMuted },
  rowRight: { marginLeft: 10, alignItems: "center", flexDirection: "row", gap: 8 },
  amount: { fontSize: 13, lineHeight: 16, fontWeight: "900", color: vars.ink },
});
