import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { BillsStackParamList } from "../../navigation/BillsStack";
import { listBills, type BillRow } from "../../data/billsStore";

type Nav = NativeStackNavigationProp<BillsStackParamList>;

export default function BillsListScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErrorMsg(null);
    try {
      const rows = await listBills();
      setItems(rows);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      // refresh when returning from add/edit
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.bgLayer}>
        <View style={styles.bgTopTint} />
        <View style={styles.bgBottomTint} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Bills</Text>
            <Text style={styles.subtitle}>Track your recurring household bills.</Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add bill"
            onPress={() => navigation.navigate("BillForm", { mode: "create" })}
            style={styles.addButton}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color={vars.ink} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : errorMsg ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Couldn’t load bills</Text>
            <Text style={styles.cardBody}>{errorMsg}</Text>
            <TouchableOpacity style={styles.primaryCta} onPress={load} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color={vars.ink} />
              <Text style={styles.primaryCtaText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No bills yet</Text>
            <Text style={styles.cardBody}>Tap + to add your first bill.</Text>
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={() => navigation.navigate("BillForm", { mode: "create" })}
              activeOpacity={0.85}
            >
              <Ionicons name="card-outline" size={18} color={vars.ink} />
              <Text style={styles.primaryCtaText}>Add a bill</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listCard}>
            {items.map((b, idx) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.row, idx === 0 && styles.rowFirst]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("BillForm", { mode: "edit", billId: b.id })}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name="card-outline" size={18} color={vars.inkMuted} />
                </View>

                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {b.is_recurring ? b.frequency : "one_off"}
                    {b.next_due_date ? ` • next: ${b.next_due_date}` : ""}
                  </Text>
                </View>

                <View style={styles.rowRight}>
                  {typeof b.amount_pence === "number" ? (
                    <Text style={styles.amount}>£{(b.amount_pence / 100).toFixed(2)}</Text>
                  ) : (
                    <Text style={styles.amountMuted}>—</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </View>
  );
}

const vars = {
  bgBase: "#F5F6F8",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(230,232,238,0.75)",
  ink: "#111827",
  inkMuted: "#6B7280",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vars.bgBase },

  bgLayer: { ...StyleSheet.absoluteFillObject },
  bgTopTint: { position: "absolute", top: 0, left: 0, right: 0, height: "62%", backgroundColor: "#F7F8FC", opacity: 0.9 },
  bgBottomTint: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%", backgroundColor: "#F2F4F8", opacity: 0.9 },

  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerText: { flex: 1, paddingRight: 12 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "700", color: vars.ink, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 18, fontWeight: "600", color: vars.inkMuted },

  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "ios"
      ? { shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }
      : { elevation: 2 }),
  },

  center: { paddingVertical: 28, alignItems: "center", justifyContent: "center" },

  card: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    padding: 16,
    ...(Platform.OS === "ios"
      ? { shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }
      : { elevation: 1 }),
  },
  cardTitle: { fontSize: 16, lineHeight: 20, fontWeight: "700", color: vars.ink, marginBottom: 6 },
  cardBody: { fontSize: 13, lineHeight: 17, fontWeight: "600", color: vars.inkMuted, marginBottom: 14 },

  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 14,
    paddingVertical: 12,
  },
  primaryCtaText: { fontSize: 14, lineHeight: 18, fontWeight: "700", color: vars.ink },

  listCard: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    ...(Platform.OS === "ios"
      ? { shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }
      : { elevation: 1 }),
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: vars.border,
  },
  rowFirst: { borderTopWidth: 0 },
  rowIcon: { width: 26, alignItems: "center", marginRight: 10 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, lineHeight: 18, fontWeight: "700", color: vars.ink },
  rowSub: { marginTop: 2, fontSize: 12, lineHeight: 15, fontWeight: "600", color: vars.inkMuted },
  rowRight: { marginLeft: 10, alignItems: "flex-end" },
  amount: { fontSize: 13, lineHeight: 16, fontWeight: "800", color: vars.ink },
  amountMuted: { fontSize: 13, lineHeight: 16, fontWeight: "700", color: vars.inkMuted },

  footerSpace: { height: 20 },
});
