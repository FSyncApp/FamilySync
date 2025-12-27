import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.appName}>FamilySync</Text>
        <Text style={styles.tagline}>Calm, family-first home operating system.</Text>
        <Text style={styles.version}>Version 0.1 (dev)</Text>
      </View>

      <View style={styles.card}>
        <Item title="Terms of service" subtitle="Coming soon" />
        <Divider />
        <Item title="Privacy policy" subtitle="Coming soon" />
        <Divider />
        <Item title="Credits" subtitle="Coming soon" />
      </View>
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
});
