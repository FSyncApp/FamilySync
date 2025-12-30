/** FS PATCH MARKER: Bills UI (DateField picker + expiry/renewal label + compact form) */
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

function stripMoneyInput(input: string) {
  return input.replace(/[^0-9.]/g, "");
}

function parseMoneyToNumber(input: string) {
  const cleaned = stripMoneyInput(input);
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

  // Existing bills open read-only until Edit.
  const [isEditing, setIsEditing] = useState(mode === "create");

  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);

  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");

  // UI-only fields (not persisted yet)
  const [provider, setProvider] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  const [autoRenewing, setAutoRenewing] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("monthly");

  // Date-only ISO: YYYY-MM-DD (Expiry when autoRenew off, Renewal when on)
  const [dateISO, setDateISO] = useState("");

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

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const load = useCallback(async () => {
    if (mode !== "edit" || !billId) return;

    setLoading(true);
    try {
      const bill = await getBillById(billId);
      if (!bill) {
        Alert.alert("Not found", "That bill no longer exists.");
        navigation.goBack();
        return;
      }

      setName(bill.name ?? "");
      setAmountText(Number(bill.amount ?? 0).toFixed(2));
      setCreatedAt(bill.created_at);

      // UI-only defaults
      setProvider("");
      setCategory("");
      setNotes("");
      setAutoRenewing(false);
      setFrequency("monthly");
      setDateISO("");

      originalRef.current = {
        name: bill.name ?? "",
        amountText: Number(bill.amount ?? 0).toFixed(2),
        provider: "",
        category: "",
        notes: "",
        autoRenewing: false,
        frequency: "monthly",
        dateISO: "",
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

  useEffect(() => {
    if (mode !== "edit") return;

    // Header right: Edit / Cancel.
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (!isEditing) {
              setIsEditing(true);
              return;
            }

            // Cancel → revert to original values (including UI-only).
            const orig = originalRef.current;
            if (orig) {
              setName(orig.name);
              setAmountText(orig.amountText);
              setProvider(orig.provider);
              setCategory(orig.category);
              setNotes(orig.notes);
              setAutoRenewing(orig.autoRenewing);
              setFrequency(orig.frequency);
              setDateISO(orig.dateISO);
            }
            setIsEditing(false);
          }}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ fontSize: 14, fontWeight: "800", color: vars.ink }}>{isEditing ? "Cancel" : "Edit"}</Text>
        </TouchableOpacity>
      ),
    });
  }, [isEditing, mode, navigation]);

  const canSubmit = useMemo(() => {
    const amt = parseMoneyToNumber(amountText);
    return !!name.trim() && typeof amt === "number" && !Number.isNaN(amt);
  }, [amountText, name]);

  const primaryLabel = useMemo(() => {
    if (saving) return mode === "create" ? "Saving..." : "Updating...";
    if (mode === "edit" && !isEditing) return "Edit";
    return mode === "create" ? "Save" : "Update";
  }, [isEditing, mode, saving]);

  const dateLabel = autoRenewing ? "Renewal date" : "Expiry date";

  const onPrimaryPress = async () => {
    if (mode === "edit" && !isEditing) {
      setIsEditing(true);
      return;
    }

    if (!canSubmit) {
      Alert.alert("Missing info", "Please enter a bill name and amount.");
      return;
    }

    setSaving(true);
    try {
      const amount = parseMoneyToNumber(amountText);

      // DB-safe upsert: only stable fields for now.
      await upsertBill({
        id: mode === "edit" ? billId : undefined,
        name: name.trim(),
        amount,
      });

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
      Alert.alert("Updated", "Your bill has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
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
          <View style={styles.moneyWrap}>
            <Text style={styles.moneyPrefix}>£</Text>
            <TextInput
              value={amountText}
              onChangeText={(t) => setAmountText(stripMoneyInput(t))}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={isEditing}
              style={[styles.moneyInput, !isEditing && styles.inputDisabled]}
            />
          </View>
          <Text style={styles.helper}>Enter pounds (e.g. 12.34)</Text>
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.col, { marginRight: 8 }]}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="e.g., Utilities"
              editable={isEditing}
              style={[styles.input, !isEditing && styles.inputDisabled]}
            />
          </View>

          <View style={[styles.col, { marginLeft: 8 }]}>
            <Text style={styles.label}>Provider</Text>
            <TextInput
              value={provider}
              onChangeText={setProvider}
              placeholder="e.g., British Gas"
              editable={isEditing}
              style={[styles.input, !isEditing && styles.inputDisabled]}
            />
          </View>
        </View>

        <View style={[styles.row, { marginBottom: 10 }]}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes…"
            editable={isEditing}
            multiline
            style={[styles.input, styles.notesInput, !isEditing && styles.inputDisabled]}
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

        {mode === "edit" && (
          <View style={styles.deleteRow}>
            <TouchableOpacity activeOpacity={0.85} onPress={onDelete} disabled={saving} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color="#991B1B" />
              <Text style={styles.deleteText}>Delete bill</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPrimaryPress}
          disabled={saving || (mode === "create" ? !canSubmit : isEditing ? !canSubmit : false)}
          style={[
            styles.primaryBtn,
            (saving || (mode === "create" ? !canSubmit : isEditing ? !canSubmit : false)) && styles.primaryBtnDisabled,
          ]}
        >
          <Text style={styles.primaryText}>{primaryLabel}</Text>
        </TouchableOpacity>
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
  helper: { marginTop: 5, fontSize: 12, fontWeight: "600", color: vars.inkMuted },

  moneyWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  moneyPrefix: { fontSize: 14, fontWeight: "900", color: vars.ink, marginRight: 6 },
  moneyInput: { flex: 1, paddingVertical: 8, fontSize: 14, fontWeight: "700", color: vars.ink },

  twoCol: { flexDirection: "row", marginBottom: 10 },
  col: { flex: 1 },

  notesInput: { minHeight: 62, textAlignVertical: "top" },

  section: {
    marginTop: 2,
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: vars.border,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: vars.ink },
  togglePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: vars.ink },
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

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  metaText: { fontSize: 12, fontWeight: "700", color: vars.inkMuted },

  deleteRow: { paddingTop: 8 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  deleteText: { fontSize: 13, fontWeight: "900", color: "#991B1B" },

  bottomBar: { marginTop: 10 },
  primaryBtn: { height: 52, borderRadius: 16, backgroundColor: vars.ink, alignItems: "center", justifyContent: "center" },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});
