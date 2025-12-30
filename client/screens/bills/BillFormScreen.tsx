/** FS PATCH MARKER: Bills v0 UX cleanup (form view/edit/delete) */
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
  // Accept: "12", "12.34", "£12.34"
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return NaN;
  return Number(cleaned);
}

export default function BillFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();

  const mode = route.params?.mode ?? "create";
  const billId = route.params?.billId;

  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  // existing bills open read-only until Edit
  const [isEditing, setIsEditing] = useState(mode === "create");

  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");

  const originalRef = useRef<{ name: string; amountText: string } | null>(null);

  const title = useMemo(() => {
    if (mode === "create") return "Add bill";
    return "Bill";
  }, [mode]);

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

      // Only use stable v0 fields: name, amount, created_at
      setName(bill.name ?? "");
      setAmountText(Number(bill.amount ?? 0).toFixed(2));
      setCreatedAt(bill.created_at);

      originalRef.current = {
        name: bill.name ?? "",
        amountText: Number(bill.amount ?? 0).toFixed(2),
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
    // Header right button for existing bill: Edit / Cancel
    if (mode !== "edit") return;

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (!isEditing) {
              setIsEditing(true);
              return;
            }
            // cancel
            const orig = originalRef.current;
            if (orig) {
              setName(orig.name);
              setAmountText(orig.amountText);
            }
            setIsEditing(false);
          }}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ fontSize: 14, fontWeight: "800", color: vars.ink }}>
            {isEditing ? "Cancel" : "Edit"}
          </Text>
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
      await upsertBill({
        id: mode === "edit" ? billId : undefined,
        name: name.trim(),
        amount,
      });

      if (mode === "create") {
        navigation.goBack();
        return;
      }

      // update original + return to view mode
      originalRef.current = { name: name.trim(), amountText: Number(amount).toFixed(2) };
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
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={isEditing}
            style={[styles.input, !isEditing && styles.inputDisabled]}
          />
          <Text style={styles.helper}>Enter pounds (e.g. 12.34)</Text>
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
  screen: { flex: 1, backgroundColor: vars.bg, padding: 16 },
  center: { alignItems: "center", justifyContent: "center" },

  card: {
    backgroundColor: vars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 14,
    shadowColor: vars.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },

  row: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "800", color: vars.ink, marginBottom: 6 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    color: vars.ink,
  },
  inputDisabled: { backgroundColor: "#F3F4F6", color: vars.inkMuted },
  helper: { marginTop: 6, fontSize: 12, fontWeight: "600", color: vars.inkMuted },

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

  bottomBar: { marginTop: 12 },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: vars.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});
