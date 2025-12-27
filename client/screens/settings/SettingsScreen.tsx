import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import type { SettingsStackParamList } from "../../navigation/SettingsStack";

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

type RowProps = {
  title: string;
  subtitle?: string;
  to:
    | keyof SettingsStackParamList
    | { name: keyof SettingsStackParamList; params?: SettingsStackParamList[keyof SettingsStackParamList] };
  badge?: string;
};

function SettingsRow({ title, subtitle, to, badge }: RowProps) {
  const navigation = useNavigation<Nav>();

  const onPress = () => {
    if (typeof to === "string") navigation.navigate(to as any);
    else navigation.navigate(to.name as any, to.params as any);
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.rowRight}>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        <Text style={styles.chev}>›</Text>
      </View>
    </TouchableOpacity>
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
  const raw = process.env.EXPO_PUBLIC_DEV_SKIP_ONBOARDING;
  const isDev = raw === "1" || raw === "true";

  // Phase 1 demo identity (no backend wiring)
  const demoName = useMemo(() => "Mark", []);
  const demoFamily = useMemo(() => "Your Family", []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{demoName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName}>{demoName}</Text>
          <Text style={styles.profileFamily}>{demoFamily}</Text>
        </View>
      </View>

      <Section title="Family">
        <SettingsRow title="Family & Members" subtitle="Manage your family space" to="FamilyMembers" />
        <SettingsRow
          title="Household Roles"
          badge="Coming soon"
          to={{
            name: "ComingSoon",
            params: {
              title: "Household Roles",
              description: "Roles help keep responsibilities clear across your family.",
              bullets: ["Adults & children", "Admin permissions", "Shared responsibility"],
            },
          }}
        />
        <SettingsRow
          title="School & Holidays"
          badge="Coming soon"
          to={{
            name: "ComingSoon",
            params: {
              title: "School & Holidays",
              description: "This will become the home for school term dates and holiday planning.",
              bullets: ["School calendar", "Holiday list", "Planning ahead"],
            },
          }}
        />
      </Section>

      <Section title="You">
        <SettingsRow title="Your Profile" subtitle="Your details (demo)" to="Profile" />
        <SettingsRow title="Notifications" subtitle="Coming in Phase 2" to="Notifications" />
        <SettingsRow title="Privacy" badge="Coming soon" to="Privacy" />
      </Section>

      <Section title="App">
        <SettingsRow title="Appearance" badge="Coming soon" to="Appearance" />
        <SettingsRow title="Customize Home Screen" badge="Coming soon" to="CustomizeHome" />
        <SettingsRow title="Language" subtitle="English" to="Language" />
        <SettingsRow title="Currency" subtitle="GBP (£)" to="Currency" />
        <SettingsRow title="Help & Feedback" to="HelpFeedback" />
        <SettingsRow title="About" to="About" />
      </Section>

      {isDev ? (
        <Section title="Developer (DEV ONLY)">
          <SettingsRow
            title="Reset onboarding"
            badge="Coming soon"
            to={{
              name: "ComingSoon",
              params: {
                title: "Reset onboarding",
                description:
                  "We’ll add a safe reset button here during development. For now, onboarding bypass is controlled by EXPO_PUBLIC_DEV_SKIP_ONBOARDING.",
                bullets: ["Dev-only action", "Safe & reversible", "Not included in production"],
              },
            }}
          />
          <SettingsRow
            title="Demo data info"
            to={{
              name: "ComingSoon",
              params: {
                title: "Demo data info",
                description: "Phase 1 uses demo-only UI content. No backend wiring is active yet.",
                bullets: ["No Supabase wiring", "No OS permissions", "UI-only screens"],
              },
            }}
          />
        </Section>
      ) : null}

      <View style={styles.signOutWrap}>
        <TouchableOpacity activeOpacity={0.7} style={styles.signOutBtn}>
          <Text style={styles.signOutTitle}>Sign out</Text>
          <Text style={styles.signOutSubtitle}>Account coming soon</Text>
        </TouchableOpacity>
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
  profileBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#111827" },
  profileText: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "700", color: "#111827" },
  profileFamily: { fontSize: 13, marginTop: 2, color: "#6B7280" },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6B7280", marginBottom: 8 },
  card: {
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  rowText: { flex: 1, paddingRight: 10 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  rowSubtitle: { fontSize: 12, marginTop: 3, color: "#6B7280" },
  rowRight: { flexDirection: "row", alignItems: "center" },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 10,
  },
  chev: { fontSize: 22, lineHeight: 22, color: "#9CA3AF", marginTop: -2 },

  signOutWrap: { marginTop: 6 },
  signOutBtn: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  signOutTitle: { fontSize: 15, fontWeight: "700", color: "#9A3412" },
  signOutSubtitle: { fontSize: 12, marginTop: 4, color: "#9A3412" },
});
