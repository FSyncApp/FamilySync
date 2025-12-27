import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { SettingsStackParamList } from "../../navigation/SettingsStack";

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

function Row({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.chev}>›</Text>
    </TouchableOpacity>
  );
}

export default function HelpFeedbackScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Row
          title="Help"
          subtitle="FAQ and guidance (coming soon)"
          onPress={() =>
            navigation.navigate("ComingSoon", {
              title: "Help",
              description: "A simple FAQ will live here in a future phase.",
              bullets: ["Getting started", "Common questions", "Troubleshooting"],
            })
          }
        />
        <Divider />
        <Row
          title="Contact us"
          subtitle="Support email (coming soon)"
          onPress={() =>
            navigation.navigate("ComingSoon", {
              title: "Contact us",
              description: "Support contact options will be available in a future phase.",
              bullets: ["Email support", "In-app form", "Response times"],
            })
          }
        />
        <Divider />
        <Row
          title="Watch the tutorial"
          subtitle="Short walkthrough (coming soon)"
          onPress={() =>
            navigation.navigate("ComingSoon", {
              title: "Watch the tutorial",
              description: "A short tutorial video will be added in a future phase.",
              bullets: ["Home overview", "Calendar basics", "Settings tour"],
            })
          }
        />
      </View>
    </ScrollView>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28, backgroundColor: "#FFFFFF", flexGrow: 1 },
  card: {
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
  },
  row: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  rowTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  rowSubtitle: { fontSize: 12, marginTop: 3, color: "#6B7280" },
  chev: { fontSize: 22, color: "#9CA3AF", marginLeft: 10, marginTop: -2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB" },
});
