import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from "react-native";

export default function ProfileScreen() {
  // Phase 1: local-only demo state (no backend wiring)
  const [firstName, setFirstName] = useState("Mark");
  const [lastName, setLastName] = useState("");
  const [email] = useState("mark@example.com");
  const [saved, setSaved] = useState(false);

  const onSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Field label="First name" value={firstName} onChangeText={setFirstName} />
        <Divider />
        <Field label="Last name" value={lastName} onChangeText={setLastName} />
        <Divider />
        <Field label="Email" value={email} editable={false} />
        <Divider />
        <Field label="Role" value="Adult (Phase 1)" editable={false} />
      </View>

      <TouchableOpacity activeOpacity={0.75} style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>

      {saved ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Saved locally (demo)</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Field({
  label,
  value,
  onChangeText,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder=""
        style={[styles.input, !editable ? styles.inputDisabled : null]}
      />
    </View>
  );
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
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  label: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 6 },
  input: {
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
  },
  inputDisabled: { backgroundColor: "#F3F4F6", color: "#6B7280" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB" },
  saveBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#111827",
  },
  saveText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  toast: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toastText: { fontSize: 12, fontWeight: "700", color: "#111827" },
});
