/** FS PATCH MARKER: Bills UI — header delete + pinned bottom bar + scroll */
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
import { deleteBill, getBillById, upsertBill } from "../../data/billsStore";
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

  const originalRef = useRef<{
    name: string;
    amountText: string;
    provider: string;
    category: string;
    notes: string;
    autoRenewing: boolean;
    frequency: Frequency;
    dateISO: string;
  } | null>(null);

  const title = useMemo(() => (mode === "create" ? "Add bill" : "Bill"), [mode]);

  const onDelete = useCallback(async () => {
    if (!billId) return;
    Alert.alert("Delete bill?", "This can’t be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            await deleteBill(billId);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Failed to delete");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [billId, navigation]);

  useEffect(() => {
    // Header: title always; delete icon only on existing bills.
    navigation.setOptions({
      title,
      headerRight:
        mode === "edit"
          ? () => (
              <TouchableOpacity
                onPress={onDelete}
                disabled={saving}
                style={{ paddingHorizontal: 12, paddingVertical: 6, opacity: saving ? 0.5 : 1 }}
                accessibilityLabel="Delete bill"
              >
                <Ionicons name="trash-outline" size={20} color="#991B1B" />
              </TouchableOpacity>
            )
          : () => null,
    });
  }, [mode, navigation, onDelete, saving, title]);

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

      originalRef.current = {
        name: loadedName,
        amountText: loadedAmountText,
        provider: (bill as any).provider ?? "",
        category: (bill as any).category ?? "",
        notes: (bill as any).notes ?? "",
        autoRenewing: ar,
        frequency: (((bill as any).frequency as Frequency) ?? "monthly") as Frequency,
        dateISO: String(iso ?? ""),
      };

      setIsEditing(false);
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

  const canSubmit = useMemo(() => {
    const amt = parseMoneyToNumber(amountText);
    return !!name.trim() && typeof amt === "number" && !Number.isNaN(amt);
  }, [amountText, name]);

  const dateLabel = autoRenewing ? "Renewal date" : "Expiry date";

  const onEditPress = () => setIsEditing(true);

  const onUndo = () => {
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
    setIsEditing(false);
  };

  const onSaveOrUpdate = async () => {
    if (!canSubmit) {
      Alert.alert("Missing info", "Please enter a bill name and amount.");
      return;
    }

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
      } as any);

      if (mode === "create") {
        navigation.goBack();
        return;
      }

      originalRef.current = {
        name: name.trim(),
        amountText: Number(amount).toFixed(2),
        provider,
        category,
        notes,
        autoRenewing,
        frequency,
        dateISO,
      };

      setIsEditing(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
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
            <View style={styles.moneyRow}>
              <Text style={styles.pound}>£</Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={isEditing}
                style={[styles.moneyInput, !isEditing && styles.inputDisabled]}
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
                style={[styles.togglePill, (!isEditing || !autoRenewing) && styles.togglePillOff]}
              >
                <Text style={[styles.toggleText, (!isEditing || !autoRenewing) && styles.toggleTextOff]}>
                  {autoRenewing ? "On" : "Off"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.freqRow, !autoRenewing && { opacity: 0.45 }]}>
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
          </View>

          {mode === "edit" && !!createdLabel && (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={vars.inkMuted} />
              <Text style={styles.metaText}>Added {createdLabel}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBarFixed}>
        {mode === "edit" ? (
          isEditing ? (
            <View style={styles.bottomRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={onUndo}
                disabled={saving}
                style={[styles.secondaryBtn, saving && styles.primaryBtnDisabled]}
              >
                <Text style={styles.secondaryText}>Undo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={onSaveOrUpdate}
                disabled={saving || !canSubmit}
                style={[styles.primaryBtn, (saving || !canSubmit) && styles.primaryBtnDisabled]}
              >
                <Text style={styles.primaryText}>{saving ? "Updating..." : "Update"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.9} onPress={onEditPress} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Edit</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onSaveOrUpdate}
            disabled={saving || !canSubmit}
            style={[styles.primaryBtn, (saving || !canSubmit) && styles.primaryBtnDisabled]}
          >
            <Text style={styles.primaryText}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        )}
      </View>
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
  pound: { fontSize: 16, fontWeight: "900", color: vars.ink, marginRight: 6 },
  moneyInput: { flex: 1, fontSize: 14, fontWeight: "800", color: vars.ink },

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

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 2 },
  metaText: { fontSize: 12, fontWeight: "700", color: vars.inkMuted },

  bottomBarFixed: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  bottomRow: { flexDirection: "row", gap: 10 },

  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: vars.ink, fontSize: 15, fontWeight: "900" },

  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: vars.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});
