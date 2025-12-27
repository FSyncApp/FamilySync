import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Constants from "expo-constants";

function getVersionText() {
  // Expo SDK 54: Constants.expoConfig is the common source at runtime.
  const version = (Constants as any)?.expoConfig?.version ?? "0.1";
  const build =
    (Constants as any)?.expoConfig?.ios?.buildNumber ??
    (Constants as any)?.expoConfig?.android?.versionCode ??
    undefined;

  return build ? `Version ${version} (build ${build})` : `Version ${version} (dev)`;
}

export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.appName}>FamilySync</Text>
        <Text style={styles.tagline}>Calm, family-first home operating system.</Text>
        <Text style={styles.version}>{getVersionText()}</Text>
      </View>

      <View style={styles.card}>
        <Item title="Terms of service" subtitle="Coming soon" />
        <Divider />
        <Item title="Privacy policy" subtitle="Coming soon" />
        <Divider />
        <Item title="Credits" subtitle="Coming soon" />
      </View>

      <Text style={styles.footnote}>
        Phase 1 is UI-only. Data syncing and account features will be added in later phases.
      </Text>
    </ScrollView>
  );
}

function Item({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemTitle}>{title}</Text>
      <Text style={styles.itemSubtitle}>{subtitle}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28, backgroundColor: "#FFFFFF", flexGrow: 1 },
  hero: { marginBottom: 16 },
  appName: { fontSize: 26, fontWeight: "900", color: "#111827" },
  tagline: { marginTop: 6, fontSize: 14, color: "#374151" },
  version: { marginTop: 10, fontSize: 12, color: "#6B7280" },

  card: {
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
  },
  item: { paddingHorizontal: 14, paddingVertical: 12 },
  itemTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  itemSubtitle: { fontSize: 12, marginTop: 3, color: "#6B7280" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB" },

  footnote: { marginTop: 14, fontSize: 12, color: "#6B7280", lineHeight: 16 },
});
