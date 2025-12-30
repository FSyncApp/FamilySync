import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import type { BillsStackParamList } from "../../navigation/BillsStack";
import { getBill, upsertBill, type BillFrequency } from "../../data/billsStore";

const FREQUENCIES: { label: string; value: BillFrequency }[] = [
  { label: "Monthly", value: "monthly" },
  { label: "Weekly", value: "weekly" },
  { label: "Yearly", value: "yearly" },
  { label: "One-off", value: "one_off" },
];

type R = RouteProp<BillsStackParamList, "BillForm">;

export default function BillFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const mode = route.params?.mode ?? "create";
  const billId = route.params?.billId;

  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState(""); // UI string
  const [frequency, setFrequency] = useState<BillFrequency>("monthly");
  const [category, setCategory] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: mode === "edit" ? "Edit bill" : "Add bill" });
  }, [mode, navigation]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (mode !== "edit" || !billId) return;

      try {
        const b = await getBill(billId);
        if (!alive) return;

        if (!b) {
          Alert.alert("Not found", "This bill no longer exists.");
          navigation.goBack();
          return;
        }

        setName(b.name);
        setAmount(typeof b.amount_pence === "number" ? (b.amount_pence / 100).toFixed(2) : "");
        setFrequency(b.frequency);
        setCategory(b.category ?? "");
        setNextDue(b.next_due_date ?? "");
        setProvider(b.provider ?? "");
        setNotes(b.notes ?? "");
        setIsRecurring(b.is_recurring);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to load bill");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [mode, billId, navigation]);

  const canSave = useMemo(() => name.trim().length > 0 && !saving, [name, saving]);

  const parseAmountPence = () => {
    const raw = amount.trim();
    if (!raw) return null;
    const normalized = raw.replace(/[^0-9.]/g, "");
    if (!normalized) return null;
    const num = Number(normalized);
    if (!Number.isFinite(num)) return null;
    return Math.round(num * 100);
  };

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      await upsertBill({
        id: mode === "edit" ? billId : undefined,
        name: name.trim(),
        amount_pence: parseAmountPence(),
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : "one_off",
        next_due_date: nextDue.trim() ? nextDue.trim() : null,
        category: category.trim() ? category.trim() : null,
        provider: provider.trim() ? provider.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.bgLayer}>
        <View style={styles.bgTopTint} />
        <View style={styles.bgBottomTint} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>
            Bill Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Electric Bill, Car Insurance"
            placeholderTextColor={vars.inkMuted}
            style={styles.input}
          />

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="£ 0.00"
                placeholderTextColor={vars.inkMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>

            <View style={{ width: 12 }} />

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.pickerFake}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    style={[
                      styles.freqChip,
                      frequency === f.value && styles.freqChipActive,
                      !isRecurring && styles.freqChipDisabled,
                    ]}
                    onPress={() => isRecurring && setFrequency(f.value)}
                    activeOpacity={0.85}
                    disabled={!isRecurring}
                  >
                    <Text style={[styles.freqChipText, frequency === f.value && styles.freqChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>Category</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="e.g., Utilities"
            placeholderTextColor={vars.inkMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Renewal / Next due date</Text>
          <TextInput
            value={nextDue}
            onChangeText={setNextDue}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={vars.inkMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Provider</Text>
          <TextInput
            value={provider}
            onChangeText={setProvider}
            placeholder="Company name"
            placeholderTextColor={vars.inkMuted}
            style={styles.input}
          />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Recurring Bill</Text>
              <Text style={styles.toggleSubtitle}>This bill will automatically renew</Text>
            </View>
            <Switch value={isRecurring} onValueChange={setIsRecurring} />
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes"
            placeholderTextColor={vars.inkMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <TouchableOpacity
            onPress={onSave}
            activeOpacity={0.9}
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            disabled={!canSave}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={vars.ink} />
            <Text style={styles.saveText}>{saving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}

const vars = {
  bgBase: "#F5F6F8",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(230,232,238,0.75)",
  ink: "#111827",
  inkMuted: "#6B7280",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vars.bgBase },

  bgLayer: { ...StyleSheet.absoluteFillObject },
  bgTopTint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "62%",
    backgroundColor: "#F7F8FC",
    opacity: 0.9,
  },
  bgBottomTint: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
    backgroundColor: "#F2F4F8",
    opacity: 0.9,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24 },

  label: { fontSize: 13, lineHeight: 16, fontWeight: "700", color: vars.ink, marginBottom: 8, marginTop: 12 },
  required: { color: vars.inkMuted },

  input: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15,
    fontWeight: "600",
    color: vars.ink,
  },

  row2: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },

  pickerFake: { flexDirection: "row", flexWrap: "wrap", gap: 8, backgroundColor: "transparent" },
  freqChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: vars.border, backgroundColor: vars.card },
  freqChipActive: { backgroundColor: "rgba(255,255,255,0.70)", borderColor: "rgba(17,24,39,0.18)" },
  freqChipDisabled: { opacity: 0.5 },
  freqChipText: { fontSize: 12, lineHeight: 14, fontWeight: "700", color: vars.inkMuted },
  freqChipTextActive: { color: vars.ink },

  toggleRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...(Platform.OS === "ios"
      ? { shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }
      : { elevation: 1 }),
  },
  toggleTitle: { fontSize: 14, lineHeight: 18, fontWeight: "800", color: vars.ink },
  toggleSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 15, fontWeight: "600", color: vars.inkMuted },

  textArea: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },

  saveButton: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.70)",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 16,
    paddingVertical: 14,
    ...(Platform.OS === "ios"
      ? { shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }
      : { elevation: 1 }),
  },
  saveButtonDisabled: { opacity: 0.55 },
  saveText: { fontSize: 15, lineHeight: 18, fontWeight: "800", color: vars.ink },
});
