import React from "react";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";

const stylesVars = {
  bg: "#F5F6F8",
  ink: "#111827",
  inkMuted: "#6B7280",
};

export default function MealsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Meals</Text>
        <Text style={styles.subtitle}>Phase 1 shell — wiring comes later.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: stylesVars.inkMuted,
    textAlign: "center",
  },
});
