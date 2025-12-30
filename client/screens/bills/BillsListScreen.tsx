/** FS PATCH MARKER: Bills list fix (error-safe load + provider fallback) */
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
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.name}
            </Text>
            {!!provider && (
              <Text style={styles.rowSub} numberOfLines={1}>
                {provider}
              </Text>
            )}
          </View>

          <View style={styles.rowRight}>
            <Text style={styles.rowAmount} numberOfLines={1}>
              {formatGBP(item.amount)}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={vars.inkMuted} style={{ marginLeft: 8 }} />
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
        Keep your family’s bills in one shared place.
      </Text>

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
        </View>
      ) : (
        <View style={styles.card}>
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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

  descriptor: { marginTop: 2, marginBottom: 12, fontSize: 13, fontWeight: "700", color: vars.inkMuted },

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
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: vars.card,
  },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: "900", color: vars.ink },
  rowSub: { marginTop: 3, fontSize: 12, fontWeight: "700", color: vars.inkMuted },

  rowRight: { flexDirection: "row", alignItems: "center" },
  rowAmount: { fontSize: 14, fontWeight: "900", color: vars.ink },

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
