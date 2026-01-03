import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { getBillById, upsertBill } from "../../migration_src/client/data/billsStore";

type Bill = {
  id: string;
  name: string;
  provider?: string | null;
  category?: string | null;
  notes?: string | null;
  amount?: number | null;
  amount_pence?: number | null;
  auto_renew?: boolean | null;
  frequency?: string | null;
  expiry_date?: string | null;
  renewal_date?: string | null;
  reminder_enabled?: boolean | null;
  reminder_days_before?: number | null;
};

function parseMoneyToPence(raw: string): number | null {
  const cleaned = raw.replace(/[£,\s]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export default function BillsFormRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const billId = typeof params.id === "string" ? params.id : undefined;

  const isEditing = !!billId;

  const [loading, setLoading] = useState<boolean>(!!billId);
  const [saving, setSaving] = useState<boolean>(false);

  const [name, setName] = useState<string>("");
  const [provider, setProvider] = useState<string>("");
  const [amountText, setAmountText] = useState<string>("");
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [frequency, setFrequency] = useState<string>("monthly");
  const [renewalDate, setRenewalDate] = useState<string>(""); // YYYY-MM-DD
  const [expiryDate, setExpiryDate] = useState<string>(""); // YYYY-MM-DD
  const [notes, setNotes] = useState<string>("");

  const [reminderEnabled, setReminderEnabled] = useState<boolean>(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<string>("7");

  const headerTitle = useMemo(() => (isEditing ? "Edit bill" : "Add bill"), [isEditing]);

  const loadExisting = useCallback(async () => {
    if (!billId) return;
    try {
      setLoading(true);
      const b = (await getBillById(billId)) as any as Bill | null;
      if (!b) {
        Alert.alert("Not found", "That bill no longer exists.", [{ text: "OK", onPress: () => router.back() }]);
        return;
      }

      setName(b.name ?? "");
      setProvider(b.provider ?? "");
      if (typeof b.amount_pence === "number") setAmountText((b.amount_pence / 100).toFixed(2));
      else if (typeof b.amount === "number") setAmountText(b.amount.toFixed(2));
      else setAmountText("");

      setAutoRenew(!!b.auto_renew);
      setFrequency(b.frequency ?? "monthly");
      setRenewalDate(b.renewal_date ?? "");
      setExpiryDate(b.expiry_date ?? "");
      setNotes(b.notes ?? "");

      setReminderEnabled(!!b.reminder_enabled);
      setReminderDaysBefore(String(b.reminder_days_before ?? 7));
    } catch (e: any) {
      Alert.alert("Couldn’t load bill", e?.message ?? "Unknown error", [{ text: "OK", onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const onSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Missing name", "Please enter a bill name.");
      return;
    }

    const amount_pence = parseMoneyToPence(amountText);

    const daysNum = Number(reminderDaysBefore);
    const reminder_days_before =
      reminderEnabled && Number.isFinite(daysNum) ? Math.max(0, Math.min(365, Math.round(daysNum))) : null;

    const payload: any = {
      id: billId,
      name: trimmedName,
      provider: provider.trim() ? provider.trim() : null,
      amount_pence,
      auto_renew: autoRenew,
      frequency: autoRenew ? frequency : null,
      renewal_date: renewalDate.trim() ? renewalDate.trim() : null,
      expiry_date: expiryDate.trim() ? expiryDate.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      reminder_enabled: reminderEnabled,
      reminder_days_before,
    };

    try {
      setSaving(true);
      await upsertBill(payload);
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn’t save bill", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }, [amountText, autoRenew, billId, expiryDate, frequency, name, notes, provider, reminderDaysBefore, reminderEnabled, renewalDate]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={18} color={vars.ink} />
            <Text style={styles.backTxt}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{headerTitle}</Text>

          <TouchableOpacity onPress={onSave} style={styles.saveBtn} activeOpacity={0.9} disabled={saving || loading}>
            <Text style={styles.saveTxt}>{saving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <Text style={styles.centerText}>Loading…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <Text style={styles.label}>Name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="e.g. Nursery fees" style={styles.input} />

              <Text style={[styles.label, { marginTop: 14 }]}>Provider</Text>
              <TextInput value={provider} onChangeText={setProvider} placeholder="Optional" style={styles.input} />

              <Text style={[styles.label, { marginTop: 14 }]}>Amount</Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                placeholder="e.g. 120.00"
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.label}>Auto-renew</Text>
                  <Text style={styles.help}>If enabled, we’ll treat this as recurring.</Text>
                </View>
                <Switch value={autoRenew} onValueChange={setAutoRenew} />
              </View>

              {autoRenew ? (
                <>
                  <Text style={[styles.label, { marginTop: 14 }]}>Frequency</Text>
                  <TextInput value={frequency} onChangeText={setFrequency} placeholder="monthly" style={styles.input} />
                </>
              ) : null}

              <Text style={[styles.label, { marginTop: 14 }]}>Renewal date (YYYY-MM-DD)</Text>
              <TextInput value={renewalDate} onChangeText={setRenewalDate} placeholder="2026-01-31" style={styles.input} />

              <Text style={[styles.label, { marginTop: 14 }]}>Expiry date (YYYY-MM-DD)</Text>
              <TextInput value={expiryDate} onChangeText={setExpiryDate} placeholder="Optional" style={styles.input} />
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.label}>Reminder</Text>
                  <Text style={styles.help}>Lightweight reminder settings (Phase 2).</Text>
                </View>
                <Switch value={reminderEnabled} onValueChange={setReminderEnabled} />
              </View>

              {reminderEnabled ? (
                <>
                  <Text style={[styles.label, { marginTop: 14 }]}>Days before</Text>
                  <TextInput
                    value={reminderDaysBefore}
                    onChangeText={setReminderDaysBefore}
                    placeholder="7"
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </>
              ) : null}

              <Text style={[styles.label, { marginTop: 14 }]}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional"
                style={[styles.input, styles.multiline]}
                multiline
              />
            </View>

            <View style={styles.bottomPad} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const vars = {
  bg: "#F6F7F9",
  card: "#FFFFFF",
  ink: "#111827",
  inkMuted: "#6B7280",
  line: "rgba(17,24,39,0.10)",
  primary: "#111827",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: vars.bg },
  flex: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: vars.line,
    backgroundColor: vars.bg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10 },
  backTxt: { fontWeight: "800", color: vars.ink },
  headerTitle: { fontSize: 16, fontWeight: "900", color: vars.ink },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: vars.primary, minWidth: 74, alignItems: "center" },
  saveTxt: { color: "#fff", fontWeight: "900" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerText: { color: vars.inkMuted },

  content: { padding: 16, gap: 12 },
  card: { backgroundColor: vars.card, borderRadius: 16, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: vars.line },

  label: { fontSize: 13, fontWeight: "800", color: vars.ink },
  help: { marginTop: 2, color: vars.inkMuted, maxWidth: 260, lineHeight: 18 },

  input: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: vars.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: vars.ink,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },

  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  rowLeft: { flex: 1 },

  bottomPad: { height: 12 },
});
