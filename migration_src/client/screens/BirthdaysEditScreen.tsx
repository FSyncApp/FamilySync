import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import DateField from "../components/DateField";

import { upsertBirthday, type Birthday } from "../data/birthdaysStore";
import type { HomeStackParamList } from "../navigation/HomeStack";

type Nav = NativeStackNavigationProp<HomeStackParamList>;
type R = RouteProp<HomeStackParamList, "BirthdaysEdit">;

export default function BirthdaysEditScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();

  const existing = route.params?.existing as Birthday | undefined;

  const [name, setName] = React.useState(existing?.name ?? "");
  const [relationship, setRelationship] = React.useState(existing?.relationship ?? "");
    const [dateYYYYMMDD, setDateYYYYMMDD] = React.useState(existing?.dateYYYYMMDD ?? "");  const onSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Missing name", "Please enter a name.");
      return;
    }

const dateTrimmed = dateYYYYMMDD.trim();
if (!dateTrimmed) {
  Alert.alert("Missing date", "Please select a birthday date.");
  return;
}

upsertBirthday({
      id: existing?.id ?? String(Date.now()), // preserves edit vs new (generate for new)
      name: trimmed,
      relationship: relationship.trim() || undefined,
      dateYYYYMMDD: dateTrimmed,
    });

if (!existing?.id) {
  navigation.reset({
    index: 0,
    routes: [{ name: "Birthdays" as any, params: { showAll: true } as any }],
  } as any);
  return;
}

navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{existing ? "Edit birthday" : "Add birthday"}</Text>
        <Text style={styles.subtitle}>Phase 1 (demo UI only)</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Emma"
            placeholderTextColor={vars.inkMuted}
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />

          <View style={styles.spacer} />

          <Text style={styles.label}>Relationship (optional)</Text>
          <TextInput
            value={relationship}
            onChangeText={setRelationship}
            placeholder="e.g. Daughter"
            placeholderTextColor={vars.inkMuted}
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />

          <View style={styles.spacer} />

          <Text style={styles.label}>Date</Text>
          <DateField
  value={dateYYYYMMDD}
  onChange={setDateYYYYMMDD}
  editable
  allowClear
  hideLabel
  placeholder="dd/mm/yyyy"
/>

          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Save birthday"
              onPress={onSave}
              activeOpacity={0.85}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Save</Text>
            </TouchableOpacity>
          </View>
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

  title: { fontSize: 26, lineHeight: 32, fontWeight: "800", color: vars.ink, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 18, fontWeight: "700", color: vars.inkMuted, marginBottom: 12 },

  card: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  label: { fontSize: 14, fontWeight: "800", color: vars.ink, marginBottom: 8 },

  input: {
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
    color: vars.ink,
    backgroundColor: "#FFFFFF",
  },

  spacer: { height: 14 },

  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: { flex: 1, fontSize: 16, fontWeight: "800", color: vars.ink },

  actions: { marginTop: 16, flexDirection: "row", justifyContent: "flex-end" },

  primary: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});
