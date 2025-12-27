import React from "react";
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BirthdaysScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Birthdays</Text>
        <Text style={styles.subtitle}>Phase 1 (demo UI only)</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upcoming</Text>

          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="gift-outline" size={18} color={vars.inkMuted} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.name}>Emma</Text>
              <Text style={styles.meta}>In 3 days</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="gift-outline" size={18} color={vars.inkMuted} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.name}>Nana</Text>
              <Text style={styles.meta}>In 18 days</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>All birthdays</Text>
          <Text style={styles.placeholder}>
            Coming soon: add/edit, sorting, and full list.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coming soon</Text>
          <Text style={styles.placeholder}>Reminders / notifications</Text>
          <Text style={styles.placeholder}>Card / gift tracking</Text>
          <Text style={styles.placeholder}>
            Shared status (e.g. “card sent”)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const vars = {
  bg: "#F5F6F8",
  card: "#FFFFFF",
  border: "#E6E8EE",
  ink: "#111827",
  inkMuted: "#6B7280",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: vars.bg },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    color: vars.ink,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: vars.inkMuted,
    marginBottom: 14,
  },

  card: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: vars.ink,
    marginBottom: 10,
  },

  row: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F2F3F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textWrap: { flex: 1 },
  name: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: vars.ink,
  },
  meta: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: vars.inkMuted,
    marginTop: 2,
  },

  divider: { height: 1, backgroundColor: vars.border, marginVertical: 12 },

  placeholder: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: vars.inkMuted,
    marginTop: 8,
  },
});
