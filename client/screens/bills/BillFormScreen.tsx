/** FS PATCH: Bill form UI polish — clearer view mode + require date + confirm £0 (UI-only) */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import type { BillsStackParamList } from "../../navigation/BillsStack";
import { getBillById, upsertBill } from "../../data/billsStore";
import DateField from "../../components/DateField";

type R = RouteProp<BillsStackParamList, "BillForm">;

function formatUKDateFromISO(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function parseMoneyToNumber(input: string) {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return NaN;
  return Number(cleaned);
}

type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";

const FREQ_OPTIONS: { key: Frequency; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

export default function BillFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();

  const mode = route.params?.mode ?? "create";
  const billId = route.params?.billId;

  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  // In edit mode, we start in view-only until the user taps Edit.
  const [isEditing, setIsEditing] = useState(mode === "create");

  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);

  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");

  const [provider, setProvider] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  const [autoRenewing, setAutoRenewing] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [dateISO, setDateISO] = useState<string>("");

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(7);
  const [reminderPreset, setReminderPreset] = useState<"1" | "3" | "7" | "14" | "custom">("7");

  const [billTitle, setBillTitle] = useState<string>("");
  const [dateError, setDateError] = useState<string | null>(null);

  const originalRef = useRef<{
    name: string;
    amountText: string;
    provider: string;
    category: string;
    notes: string;
    autoRenewing: boolean;
    frequency: Frequency;
    dateISO: string;
    reminderEnabled: boolean;
    reminderDaysBefore: number;
    reminderPreset: "1" | "3" | "7" | "14" | "custom";
  } | null>(null);

  const canSubmit = useMemo(() => {
    const amt = parseMoneyToNumber(amountText);
    return !!name.trim() && typeof amt === "number" && !Number.isNaN(amt);
  }, [amountText, name]);

  const hasDate = !!dateISO;
  const effectiveReminderEnabled = reminderEnabled && hasDate;

  const dateLabel = autoRenewing ? "Renewal date" : "Expiry date";

  useEffect(() => {
    // If there is no date, reminders can’t be active.
    if (!dateISO) {
      setReminderEnabled(false);
    }
    if (dateISO) setDateError(null);
  }, [dateISO]);

  useEffect(() => {
    if (!autoRenewing) setDateError(null);
  }, [autoRenewing]);


  const onEditPress = useCallback(() => setIsEditing(true), []);

  const onCancel = useCallback(() => {
    const orig = originalRef.current;
    if (!orig) {
      setIsEditing(false);
      return;
    }
    setName(orig.name);
    setAmountText(orig.amountText);
    setProvider(orig.provider);
    setCategory(orig.category);
    setNotes(orig.notes);
    setAutoRenewing(orig.autoRenewing);
    setFrequency(orig.frequency);
    setDateISO(orig.dateISO);
    setReminderEnabled(orig.reminderEnabled);
    setReminderDaysBefore(orig.reminderDaysBefore);
    setReminderPreset(orig.reminderPreset);
    setDateError(null);
    setIsEditing(false);
  }, []);

  const doSaveOrUpdate = useCallback(async () => {
    setSaving(true);
    try {
      const amount = parseMoneyToNumber(amountText);

      await upsertBill({
        id: mode === "edit" ? billId : undefined,
        name: name.trim(),
        amount,
        provider: provider.trim(),
        category: category.trim(),
        notes: notes.trim(),
        auto_renew: autoRenewing,
        frequency,
        expiry_date: autoRenewing ? null : (dateISO || null),
        renewal_date: autoRenewing ? (dateISO || null) : null,
        reminder_enabled: reminderEnabled,
        reminder_days_before: reminderDaysBefore,
      } as any);

      if (mode === "create") {
        navigation.goBack();
        return;
      }

      // Update our "original" snapshot to enable cancel/back-to-view mode.
      originalRef.current = {
        name: name.trim(),
        amountText: Number(amount).toFixed(2),
        provider,
        category,
        notes,
        autoRenewing,
        frequency,
        dateISO,
        reminderEnabled,
        reminderDaysBefore,
        reminderPreset,
      };

      setBillTitle(name.trim());
      setIsEditing(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [
    amountText,
    autoRenewing,
    billId,
    category,
    dateISO,
    frequency,
    mode,
    name,
    navigation,
    notes,
    provider,
    reminderDaysBefore,
    reminderEnabled,
    reminderPreset,
  ]);

  const onSaveOrUpdate = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert("Missing info", "Please enter a bill name and amount.");
      return;
    }

    if (autoRenewing && !dateISO) {
      setDateError("Please set a renewal date before saving.");
      Alert.alert("Missing renewal date", "Please set a renewal date before saving.");
      return;
    }

    const amount = parseMoneyToNumber(amountText);
    if (Number.isFinite(amount) && amount === 0) {
      Alert.alert(
        "Amount is £0",
        "Are you sure you want this bill total to be £0.00?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: mode === "create" ? "Save anyway" : "Update anyway",
            style: "default",
            onPress: () => {
              doSaveOrUpdate();
            },
          },
        ]
      );
      return;
    }

    await doSaveOrUpdate();
  }, [amountText, canSubmit, dateISO, doSaveOrUpdate, mode]);

  // Title rules:
  // - Create: "Add bill"
  // - Edit: show bill name if we have one, otherwise "Bills"
  const headerTitle = useMemo(() => {
    if (mode === "create") return "Add bill";
    return billTitle?.trim() ? billTitle.trim() : "Bills";
  }, [billTitle, mode]);

  // Header actions (Option A)
  useEffect(() => {
    navigation.setOptions({
      title: headerTitle,
      headerLeft: () =>
        mode === "edit" && isEditing ? (
          <TouchableOpacity
            onPress={onCancel}
            disabled={saving}
            style={{ paddingHorizontal: 12, paddingVertical: 6, opacity: saving ? 0.5 : 1 }}
            accessibilityLabel="Cancel editing"
          >
            <Text style={{ fontSize: 15, fontWeight: "900", color: vars.inkMuted }}>Cancel</Text>
          </TouchableOpacity>
        ) : null,
      headerRight: () => {
        // Create: Save
        if (mode === "create") {
          const disabled = saving || !canSubmit;
          return (
            <TouchableOpacity
              onPress={onSaveOrUpdate}
              disabled={disabled}
              style={{ paddingHorizontal: 12, paddingVertical: 6, opacity: disabled ? 0.5 : 1 }}
              accessibilityLabel="Save bill"
            >
              <Text style={{ fontSize: 15, fontWeight: "900", color: vars.ink }}>Save</Text>
            </TouchableOpacity>
          );
        }

        // Edit: View mode => Edit
        //       Editing  => Update
        const label = isEditing ? (saving ? "Updating…" : "Update") : "Edit";
        const disabled = saving || (isEditing ? !canSubmit : false);

        return (
          <TouchableOpacity
            onPress={() => (isEditing ? onSaveOrUpdate() : onEditPress())}
            disabled={disabled}
            style={{ paddingHorizontal: 12, paddingVertical: 6, opacity: disabled ? 0.5 : 1 }}
            accessibilityLabel={isEditing ? "Update bill" : "Edit bill"}
          >
            <Text style={{ fontSize: 15, fontWeight: "900", color: vars.ink }}>{label}</Text>
          </TouchableOpacity>
        );
      },
    });
  }, [canSubmit, headerTitle, isEditing, mode, navigation, onCancel, onEditPress, onSaveOrUpdate, saving]);

  const load = useCallback(async () => {
    if (mode !== "edit") return;

    if (!billId) {
      Alert.alert("Missing bill", "No bill was provided to open.");
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      const bill = await getBillById(billId);
      if (!bill) {
        Alert.alert("Not found", "That bill no longer exists.");
        navigation.goBack();
        return;
      }

      const loadedName = bill.name ?? "";
      const loadedAmountText = Number(bill.amount ?? 0).toFixed(2);

      setName(loadedName);
      setAmountText(loadedAmountText);
      setCreatedAt(bill.created_at);

      setProvider((bill as any).provider ?? "");
      setCategory((bill as any).category ?? "");
      setNotes((bill as any).notes ?? "");

      const ar = Boolean((bill as any).auto_renew ?? false);
      setAutoRenewing(ar);
      setFrequency(((bill as any).frequency as Frequency) ?? "monthly");

      const iso = (ar ? (bill as any).renewal_date : (bill as any).expiry_date) ?? "";
      setDateISO(String(iso ?? ""));

      const reEnabled = Boolean((bill as any).reminder_enabled ?? false);
      const reDays = Number((bill as any).reminder_days_before ?? 7);
      const safeDays = Number.isFinite(reDays) && reDays > 0 ? reDays : 7;
      setReminderEnabled(reEnabled);
      setReminderDaysBefore(safeDays);
      setReminderPreset(
        safeDays === 1 || safeDays === 3 || safeDays === 7 || safeDays === 14
          ? (String(safeDays) as any)
          : "custom"
      );

      setBillTitle(loadedName);

      originalRef.current = {
        name: loadedName,
        amountText: loadedAmountText,
        provider: (bill as any).provider ?? "",
        category: (bill as any).category ?? "",
        notes: (bill as any).notes ?? "",
        autoRenewing: ar,
        frequency: (((bill as any).frequency as Frequency) ?? "monthly") as Frequency,
        dateISO: String(iso ?? ""),
        reminderEnabled: reEnabled,
        reminderDaysBefore: safeDays,
        reminderPreset:
          safeDays === 1 || safeDays === 3 || safeDays === 7 || safeDays === 14
            ? (String(safeDays) as any)
            : "custom",
      };

      setIsEditing(false);
      setDateError(null);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load bill");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [billId, mode, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  const createdLabel = formatUKDateFromISO(createdAt);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 18 }}>
        {mode === "edit" && !isEditing && (
          <View style={styles.readOnlyBanner}>
            <Ionicons name="eye-outline" size={16} color={vars.inkMuted} />
            <Text style={styles.readOnlyBannerText}>View mode • Tap Edit to make changes</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Bill name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g., Electric, Car insurance"
              editable={isEditing}
              style={[styles.input, !isEditing && styles.inputDisabled]}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Amount</Text>
            <View style={[styles.moneyRow, !isEditing && styles.moneyRowDisabled]}>
              <Text style={[styles.pound, !isEditing && styles.poundDisabled]}>£</Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={isEditing}
                style={[styles.moneyInput, !isEditing && styles.moneyInputDisabled]}
              />
            </View>
          </View>

          <View style={styles.row2}>
            <Text style={styles.label}>Provider</Text>
            <TextInput
              value={provider}
              onChangeText={setProvider}
              placeholder="e.g., British Gas"
              editable={isEditing}
              style={[styles.input, !isEditing && styles.inputDisabled]}
            />
          </View>

          <View style={styles.row2}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="e.g., Utilities"
              editable={isEditing}
              style={[styles.input, !isEditing && styles.inputDisabled]}
            />
          </View>

          <View style={styles.row2}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              editable={isEditing}
              multiline
              style={[styles.notes, !isEditing && styles.inputDisabled]}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Auto-renewing</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => isEditing && setAutoRenewing((v) => !v)}
                disabled={!isEditing}
                style={[
                  styles.togglePill,
                  (!isEditing || !autoRenewing) && styles.togglePillOff,
                  !isEditing && styles.disabledPill,
                ]}
              >
                <Text style={[styles.toggleText, (!isEditing || !autoRenewing) && styles.toggleTextOff]}>
                  {autoRenewing ? "On" : "Off"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.freqRow, !autoRenewing && { opacity: 0.45 }, !isEditing && { opacity: 0.55 }]}>
              {FREQ_OPTIONS.map((opt) => {
                const selected = frequency === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    activeOpacity={0.85}
                    disabled={!isEditing || !autoRenewing}
                    onPress={() => setFrequency(opt.key)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <DateField
              label={dateLabel}
              value={dateISO || undefined}
              onChange={setDateISO}
              editable={isEditing}
              placeholder="dd/mm/yyyy"
            />

            {!!dateError && <Text style={styles.errorInline}>{dateError}</Text>}

            <View style={styles.reminderSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Reminders</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => isEditing && hasDate && setReminderEnabled((v) => !v)}
                  disabled={!isEditing || !hasDate}
                  style={[
                    styles.togglePill,
                    (!isEditing || !hasDate || !effectiveReminderEnabled) && styles.togglePillOff,
                    !isEditing && styles.disabledPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      (!isEditing || !hasDate || !effectiveReminderEnabled) && styles.toggleTextOff,
                    ]}
                  >
                    {effectiveReminderEnabled ? "On" : "Off"}
                  </Text>
                </TouchableOpacity>
              </View>

              {!hasDate ? (
                <Text style={styles.helperText}>Set a date above to enable reminders.</Text>
              ) : (
                <>
                  <View style={[styles.reminderChips, !effectiveReminderEnabled && { opacity: 0.45 }]}>
                    {[
                      { key: "1", label: "1 day" },
                      { key: "3", label: "3 days" },
                      { key: "7", label: "7 days" },
                      { key: "14", label: "14 days" },
                      { key: "custom", label: "Custom" },
                    ].map((opt) => {
                      const selected = reminderPreset === (opt.key as any);
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          activeOpacity={0.85}
                          disabled={!isEditing || !effectiveReminderEnabled}
                          onPress={() => {
                            setReminderPreset(opt.key as any);
                            if (opt.key !== "custom") {
                              const n = Number(opt.key);
                              if (Number.isFinite(n)) setReminderDaysBefore(n);
                            }
                          }}
                          style={[styles.chip, selected && styles.chipSelected]}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {reminderPreset === "custom" && (
                    <View style={[styles.customRow, !effectiveReminderEnabled && { opacity: 0.45 }]}>
                      <Text style={styles.customLabel}>Days before</Text>
                      <TextInput
                        value={String(reminderDaysBefore)}
                        onChangeText={(t) => {
                          const v = Number(String(t).replace(/[^0-9]/g, ""));
                          if (!Number.isFinite(v)) return;
                          setReminderDaysBefore(Math.max(1, Math.min(365, v)));
                        }}
                        keyboardType="number-pad"
                        editable={isEditing && effectiveReminderEnabled}
                        style={[styles.customInput, (!isEditing || !effectiveReminderEnabled) && styles.inputDisabled]}
                      />
                    </View>
                  )}

                  <Text style={styles.helperText}>
                    Reminds you {reminderDaysBefore} day{reminderDaysBefore === 1 ? "" : "s"} before.
                  </Text>
                </>
              )}
            </View>
          </View>

          {mode === "edit" && !!createdLabel && (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={vars.inkMuted} />
              <Text style={styles.metaText}>Added {createdLabel}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const vars = {
  bg: "#F6F7F9",
  ink: "#111827",
  inkMuted: "#6B7280",
  card: "#FFFFFF",
  border: "#E5E7EB",
  shadow: "rgba(17, 24, 39, 0.08)",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vars.bg, padding: 14 },
  center: { alignItems: "center", justifyContent: "center" },

  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "rgba(255,255,255,0.75)",
    marginBottom: 10,
  },
  readOnlyBannerText: { fontSize: 12, fontWeight: "800", color: vars.inkMuted },

  card: {
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 12,
    shadowColor: vars.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },

  row: { marginBottom: 10 },
  row2: { marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "800", color: vars.ink, marginBottom: 6 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "700",
    color: vars.ink,
  },
  inputDisabled: { backgroundColor: "#F3F4F6", color: vars.inkMuted },
  notes: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "700",
    color: vars.ink,
    minHeight: 70,
    textAlignVertical: "top",
  },

  moneyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    height: 44,
  },
  moneyRowDisabled: { backgroundColor: "#F3F4F6" },
  pound: { fontSize: 16, fontWeight: "900", color: vars.ink, marginRight: 6 },
  poundDisabled: { color: vars.inkMuted },
  moneyInput: { flex: 1, fontSize: 14, fontWeight: "800", color: vars.ink },
  moneyInputDisabled: { color: vars.inkMuted },

  section: {
    marginTop: 2,
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: vars.border,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: vars.ink },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: vars.ink,
  },
  togglePillOff: { backgroundColor: "#E5E7EB" },
  disabledPill: { opacity: 0.7 },
  toggleText: { fontSize: 12, fontWeight: "900", color: "#FFFFFF" },
  toggleTextOff: { color: vars.inkMuted },

  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginBottom: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "#FFFFFF",
  },
  chipSelected: { backgroundColor: vars.ink, borderColor: vars.ink },
  chipText: { fontSize: 12, fontWeight: "800", color: vars.ink },
  chipTextSelected: { color: "#FFFFFF" },

  errorInline: { marginTop: 8, fontSize: 12, fontWeight: "800", color: "#B91C1C" },

  reminderSection: { marginTop: 12 },
  reminderChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  helperText: { marginTop: 8, fontSize: 12, fontWeight: "700", color: vars.inkMuted },
  customRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  customLabel: { fontSize: 12, fontWeight: "800", color: vars.ink },
  customInput: {
    width: 92,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "800",
    color: vars.ink,
    textAlign: "center",
  },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 2 },
  metaText: { fontSize: 12, fontWeight: "700", color: vars.inkMuted },
});
