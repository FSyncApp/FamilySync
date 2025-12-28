import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { SettingsStackParamList } from "../../navigation/SettingsStack";

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

type RowProps = {
  title: string;
  subtitle?: string;
  to: keyof SettingsStackParamList;
  badge?: string;
};

function SettingsRow({ title, subtitle, to, badge }: RowProps) {
  const navigation = useNavigation<Nav>();
  return (
    <View style={styles.rowOuter}>
      <View
        style={styles.row}
        // Use a plain onPress pattern via navigation header buttons in sub-screens.
        // Row itself is pressable via the wrapper below.
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
        </View>
        {!!badge && <Text style={styles.badge}>{badge}</Text>}
        <Text style={styles.chev}>›</Text>
      </View>

      {/* Transparent pressable overlay */}
      <Text
        accessibilityRole="button"
        onPress={() => navigation.navigate(to as any)}
        style={styles.rowPressOverlay}
      >
        {" "}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Settings</Text>

      <Section title="Calendar">
        <SettingsRow
          title="Calendar settings"
          subtitle="School runs people and school year display"
          to="CalendarSettings"
        />
      </Section>

      <Section title="Home">
        <SettingsRow title="Customize Home" subtitle="Shortcuts and layout" to="CustomizeHome" />
      </Section>

      <Section title="Account">
        <SettingsRow title="Your Profile" to="Profile" />
        <SettingsRow title="Family & Members" to="FamilyMembers" />
        <SettingsRow title="Privacy" subtitle="Coming soon" to="Privacy" badge="Soon" />
      </Section>

      <Section title="Preferences">
        <SettingsRow title="Appearance" to="Appearance" />
        <SettingsRow title="Language" to="Language" />
        <SettingsRow title="Currency" to="Currency" />
        <SettingsRow title="Notifications" subtitle="Coming soon" to="Notifications" badge="Soon" />
      </Section>

      <Section title="Support">
        <SettingsRow title="Help & Feedback" to="HelpFeedback" />
        <SettingsRow title="About" to="About" />
      </Section>

      <Text style={styles.footer}>Phase 1 scaffold — more settings will appear as features land.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: "#F7F8FB",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    overflow: "hidden",
  },
  rowOuter: {
    position: "relative",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F5",
  },
  rowPressOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  rowSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  chev: {
    fontSize: 20,
    fontWeight: "800",
    color: "#9CA3AF",
    marginLeft: 4,
  },
  badge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  footer: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
});
