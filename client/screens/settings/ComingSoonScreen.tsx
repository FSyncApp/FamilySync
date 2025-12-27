import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { SettingsStackParamList } from "../../navigation/SettingsStack";

type Nav = NativeStackNavigationProp<SettingsStackParamList>;
type R = RouteProp<SettingsStackParamList, "ComingSoon">;

/**
 * Canonical Phase 1 placeholder destination for any Settings item not yet implemented.
 * UI-only, no wiring.
 */
export default function ComingSoonScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();

  const title = route.params?.title ?? "Coming soon";
  const description =
    route.params?.description ??
    "This area will be built in a future phase. For Phase 1, we’re focusing on the core home experience.";
  const bullets = route.params?.bullets ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>

      {bullets.length ? (
        <View style={styles.card}>
          {bullets.map((b, idx) => (
            <View key={`${idx}-${b}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={styles.backBtn}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: "#FFFFFF",
    flexGrow: 1,
  },
  title: { fontSize: 22, fontWeight: "900", color: "#111827", marginBottom: 10 },
  desc: { fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 14 },

  card: {
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 14,
    marginBottom: 16,
  },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  bulletDot: { width: 16, fontSize: 16, lineHeight: 18, color: "#6B7280" },
  bulletText: { flex: 1, fontSize: 14, color: "#111827", lineHeight: 20 },

  backBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    backgroundColor: "#111827",
  },
  backText: { color: "#FFFFFF", fontWeight: "800" },
});
