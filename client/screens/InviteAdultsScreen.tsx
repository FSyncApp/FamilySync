import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "InviteAdults">;

type Invite = {
  id: string;
  name: string;
  email: string;
};

const stylesVars = {
  bg: "#F5F6F8",
  card: "#FFFFFF",
  border: "#E6E8EE",
  ink: "#111827",
  inkMuted: "#6B7280",
};

function isLikelyEmail(value: string) {
  const v = value.trim();
  // intentionally light validation for Phase 2/3
  return v.includes("@") && v.includes(".") && v.length >= 5;
}

export default function InviteAdultsScreen({ navigation }: Props) {
  // Phase 2–3: capture invite intent only (no email sending yet)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);

  const canAdd = useMemo(() => {
    return name.trim().length > 0 && isLikelyEmail(email);
  }, [name, email]);

  const onAddInvite = () => {
    const n = name.trim();
    const e = email.trim().toLowerCase();

    if (!n) {
      Alert.alert("Name needed", "Please enter their name.");
      return;
    }
    if (!isLikelyEmail(e)) {
      Alert.alert("Email needed", "Please enter a valid email address.");
      return;
    }

    const dup = invites.some((i) => i.email.toLowerCase() === e);
    if (dup) {
      Alert.alert("Already added", "That email is already in your invite list.");
      return;
    }

    const next: Invite = {
      id: String(Date.now()),
      name: n,
      email: e,
    };

    setInvites((prev) => [next, ...prev]);
    setName("");
    setEmail("");
  };

  const onRemoveInvite = (id: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const goToMainHome = () => {
    // Deterministic: always land on Main -> Home tab
    navigation.reset({
      index: 0,
      routes: [{ name: "Main", params: { screen: "Home" } as any }],
    });
  };

  const onContinue = () => {
    goToMainHome();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={styles.page}
          contentContainerStyle={styles.pageContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Invite your family</Text>
          <Text style={styles.subtitle}>Add one invite at a time. You can invite more people later.</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Their name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sarah"
              placeholderTextColor={stylesVars.inkMuted}
              style={styles.input}
              returnKeyType="next"
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Their email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. sarah@example.com"
              placeholderTextColor={stylesVars.inkMuted}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add invite"
              onPress={onAddInvite}
              activeOpacity={0.85}
              style={[styles.primaryButton, !canAdd && styles.primaryButtonDisabled]}
              disabled={!canAdd}
            >
              <Ionicons name="add-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Add invite</Text>
            </TouchableOpacity>
          </View>

          {invites.length > 0 ? (
            <View style={styles.listBlock}>
              <Text style={styles.listHeader}>Invites</Text>

              {invites.map((inv) => (
                <View key={inv.id} style={styles.inviteRow}>
                  <View style={styles.inviteText}>
                    <Text style={styles.inviteName} numberOfLines={1}>
                      {inv.name}
                    </Text>
                    <Text style={styles.inviteEmail} numberOfLines={1}>
                      {inv.email}
                    </Text>
                  </View>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Remove invite for ${inv.name}`}
                    onPress={() => onRemoveInvite(inv.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close-circle-outline" size={22} color={stylesVars.inkMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue to Home"
              onPress={onContinue}
              activeOpacity={0.85}
              style={styles.primaryButtonWide}
            >
              <Text style={styles.primaryButtonWideText}>Continue</Text>
            </TouchableOpacity>

            <Text style={styles.helper}>Invites will be emailed once family sharing is enabled.</Text>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  page: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },

  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: stylesVars.inkMuted,
    marginBottom: 14,
  },

  card: {
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    padding: 14,
  },

  label: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 6,
  },

  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "600",
    color: stylesVars.ink,
    backgroundColor: "#fff",
  },

  primaryButton: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: stylesVars.ink,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
  },

  listBlock: {
    marginTop: 14,
  },
  listHeader: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 10,
  },
  inviteRow: {
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  inviteText: {
    flex: 1,
    paddingRight: 10,
  },
  inviteName: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 2,
  },
  inviteEmail: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: stylesVars.inkMuted,
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  actions: {
    marginTop: 18,
  },

  primaryButtonWide: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    backgroundColor: stylesVars.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonWideText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
  },

  helper: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: stylesVars.inkMuted,
    textAlign: "center",
  },
});
