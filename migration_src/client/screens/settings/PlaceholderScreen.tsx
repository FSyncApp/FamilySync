import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

type Props = {
  route: { params?: { title?: string; description?: string; bullets?: string[] } };
};

export default function PlaceholderScreen({ route }: Props) {
  const title = route.params?.title ?? "Coming soon";
  const description =
    route.params?.description ??
    "This area is planned for a future phase. For Phase 1 we’re keeping FamilySync calm and focused.";
  const bullets = route.params?.bullets ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{description}</Text>

      {bullets.length > 0 ? (
        <View style={styles.bullets}>
          {bullets.map((b, idx) => (
            <View key={`${idx}-${b}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>Phase 1 note</Text>
        <Text style={styles.tipBody}>
          This screen is intentionally UI-only. No settings are applied yet, and nothing triggers OS permissions.
        </Text>
      </View>
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111827",
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: "#374151",
  },
  bullets: {
    marginTop: 14,
    paddingLeft: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bulletDot: {
    width: 16,
    fontSize: 16,
    lineHeight: 20,
    color: "#111827",
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: "#374151",
  },
  tipBox: {
    marginTop: 18,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#F3F4F6",
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
  },
});
