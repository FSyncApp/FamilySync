import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import {
  NavigationContainer,
  NavigationIndependentTree,
  InitialState,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import MainTabs from "../migration_src/client/navigation/MainTabs";

type LegacyTarget = "Home" | "Calendar" | "Messages" | "Settings" | "Bills" | "Tasks" | "Birthdays";

function buildInitialState(target: LegacyTarget): InitialState {
  const tabRoutes: any[] = [
    { name: "Home" },
    { name: "Calendar" },
    { name: "Messages" },
    { name: "Settings" },
  ];

  if (target === "Calendar" || target === "Messages" || target === "Settings") {
    const index = tabRoutes.findIndex((r) => r.name === target);
    return { stale: false, type: "tab", key: "legacy-tab", index: Math.max(index, 0), routeNames: tabRoutes.map(r => r.name), routes: tabRoutes };
  }

  if (target === "Bills" || target === "Tasks" || target === "Birthdays") {
    const homeIndex = tabRoutes.findIndex((r) => r.name === "Home");

    tabRoutes[homeIndex] = {
      name: "Home",
      state: {
        stale: false,
        type: "stack",
        key: "legacy-home-stack",
        index: 0,
        routeNames: ["Home", "Bills", "Tasks", "Birthdays"],
        routes: [{ name: target }],
      },
    };

    return {
      stale: false,
      type: "tab",
      key: "legacy-tab",
      index: homeIndex,
      routeNames: tabRoutes.map((r) => r.name),
      routes: tabRoutes,
    };
  }

  return { stale: false, type: "tab", key: "legacy-tab", index: 0, routeNames: tabRoutes.map(r => r.name), routes: tabRoutes };
}

export default function LegacyScreen() {
  const params = useLocalSearchParams<{ to?: string }>();
  const raw = (params.to ?? "Home") as string;

  const target: LegacyTarget = ([
    "Home",
    "Calendar",
    "Messages",
    "Settings",
    "Bills",
    "Tasks",
    "Birthdays",
  ] as const).includes(raw as any)
    ? (raw as LegacyTarget)
    : "Home";

  const initialState = useMemo(() => buildInitialState(target), [target]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LEGACY</Text>
          </View>
          <Text style={styles.headerTitle}>FamilySync (Legacy)</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to new Home"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={18} color="#ffffff" />
          <Text style={styles.backButtonText}>New Home</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subheader}>Migration Mode • {Platform.OS} • to: {target}</Text>

      <View style={styles.legacy}>
        <NavigationIndependentTree>
          <NavigationContainer initialState={initialState}>
            <MainTabs />
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
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0B1220",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F97316",
  },
  badgeText: { color: "#111827", fontWeight: "900", fontSize: 12, letterSpacing: 0.3 },
  headerTitle: { color: "#ffffff", fontSize: 16, fontWeight: "800" },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  backButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },

  subheader: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
    backgroundColor: "#0B1220",
  },

  legacy: { flex: 1, backgroundColor: "#ffffff" },
});
