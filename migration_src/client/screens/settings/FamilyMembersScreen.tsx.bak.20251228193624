import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { SettingsStackParamList } from "../../navigation/SettingsStack";

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

type Member = {
  id: string;
  name: string;
  role: string;
  tag?: string;
};

function MemberRow({ m }: { m: Member }) {
  const navigation = useNavigation<Nav>();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.memberRow}
      onPress={() =>
        navigation.navigate("ComingSoon", {
          title: m.name,
          description: "Member details will be editable once family management is enabled in a future phase.",
          bullets: ["Profile & permissions", "Contact details", "Visibility & roles"],
        })
      }
    >
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>{m.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.memberText}>
        <Text style={styles.memberName}>{m.name}</Text>
        <Text style={styles.memberRole}>{m.role}</Text>
      </View>
      {m.tag ? <Text style={styles.memberTag}>{m.tag}</Text> : null}
      <Text style={styles.chev}>›</Text>
    </TouchableOpacity>
  );
}

export default function FamilyMembersScreen() {
  const members: Member[] = [
    { id: "m1", name: "Mark", role: "Adult", tag: "Admin" },
    { id: "m2", name: "Partner", role: "Adult" },
    { id: "m3", name: "Child 1", role: "Child" },
    { id: "m4", name: "Child 2", role: "Child" },
  ];

  const navigation = useNavigation<Nav>();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.familyCard}>
        <Text style={styles.familyTitle}>Your Family</Text>
        <Text style={styles.familySubtitle}>This is your shared family space (Phase 1 demo).</Text>
        <View style={styles.familyMetaRow}>
          <Text style={styles.familyMetaLabel}>Invites</Text>
          <Text style={styles.familyMetaValue}>Coming soon</Text>
        </View>
        <View style={styles.familyMetaRow}>
          <Text style={styles.familyMetaLabel}>Roles</Text>
          <Text style={styles.familyMetaValue}>Coming soon</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Members</Text>
      <View style={styles.card}>
        {members.map((m, idx) => (
          <View key={m.id}>
            <MemberRow m={m} />
            {idx < members.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate("ComingSoon", {
              title: "Add family member",
              description: "Adding members will be available once invites and accounts are enabled in a future phase.",
              bullets: ["Invite by email", "Add children", "Manage permissions"],
            })
          }
        >
          <Text style={styles.actionTitle}>Add family member</Text>
          <Text style={styles.actionSubtitle}>Coming soon</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate("ComingSoon", {
              title: "Manage invites",
              description: "Invites will live here once multi-person onboarding is enabled.",
              bullets: ["Pending invites", "Resend", "Remove"],
            })
          }
        >
          <Text style={styles.actionTitle}>Manage invites</Text>
          <Text style={styles.actionSubtitle}>Coming soon</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28, backgroundColor: "#FFFFFF", flexGrow: 1 },

  familyCard: {
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 14,
    marginBottom: 18,
  },
  familyTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  familySubtitle: { fontSize: 13, color: "#6B7280", marginTop: 6 },
  familyMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  familyMetaLabel: { fontSize: 13, color: "#6B7280" },
  familyMetaValue: { fontSize: 13, fontWeight: "700", color: "#111827" },

  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6B7280", marginBottom: 8 },
  card: {
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
  },
  memberRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberAvatarText: { fontSize: 14, fontWeight: "800", color: "#111827" },
  memberText: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  memberRole: { fontSize: 12, marginTop: 2, color: "#6B7280" },
  memberTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 10,
  },
  chev: { fontSize: 22, color: "#9CA3AF", marginTop: -2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB", marginLeft: 62 },

  actions: { marginTop: 14, gap: 12 },
  actionBtn: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  actionSubtitle: { fontSize: 12, marginTop: 4, color: "#6B7280" },
});
