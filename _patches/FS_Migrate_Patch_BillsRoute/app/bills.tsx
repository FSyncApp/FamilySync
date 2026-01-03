import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { NavigationContainer, NavigationIndependentTree } from "@react-navigation/native";

import BillsStack from "../migration_src/client/navigation/BillsStack";

export default function BillsEntryScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="receipt-outline" size={18} color="#ffffff" />
          <Text style={styles.headerTitle}>Bills</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>MIGRATION</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <Ionicons name="arrow-back" size={18} color="#ffffff" />
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <NavigationIndependentTree>
          <NavigationContainer>
            <BillsStack />
          </NavigationContainer>
        </NavigationIndependentTree>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B1220" },
  header: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0B1220",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  pill: {
    marginLeft: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  pillText: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.2 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  backText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  body: { flex: 1, backgroundColor: "#ffffff" },
});
