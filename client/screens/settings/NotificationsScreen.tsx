import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function NotificationsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.body}>
        Notification controls will be available once reminders, messages, and alerts are enabled in a future phase.
      </Text>

      <View style={styles.card}>
        <Row title="Messages" subtitle="Coming in Phase 2" />
        <Divider />
        <Row title="Calendar reminders" subtitle="Coming in Phase 2" />
        <Divider />
        <Row title="Birthdays" subtitle="Coming in Phase 2" />
        <Divider />
        <Row title="School & pickups" subtitle="Coming in Phase 2" />
      </View>

      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>Phase 1 note</Text>
        <Text style={styles.tipBody}>No notification permissions are requested in Phase 1.</Text>
      </View>
    </ScrollView>
  );
}

function Row({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.lock}>—</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28, backgroundColor: "#FFFFFF", flexGrow: 1 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 21, color: "#374151" },
  card: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
  },
  row: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  rowTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  rowSubtitle: { fontSize: 12, marginTop: 3, color: "#6B7280" },
  lock: { fontSize: 18, color: "#9CA3AF", marginLeft: 10 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB" },
  tipBox: { marginTop: 18, borderRadius: 12, padding: 14, backgroundColor: "#F3F4F6" },
  tipTitle: { fontSize: 13, fontWeight: "800", color: "#111827", marginBottom: 6 },
  tipBody: { fontSize: 13, lineHeight: 18, color: "#374151" },
});
