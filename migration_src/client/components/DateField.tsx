import React, { useMemo, useState } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View, ViewStyle, TextStyle } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

/**
 * DateField
 * - Displays dd/mm/yyyy
 * - Stores date-only ISO: YYYY-MM-DD
 * - Opens a modal picker on iOS so it never renders below the screen
 * - Uses iOS "inline" (calendar) display (falls back gracefully if unsupported)
 *
 * FS NOTE:
 * This component is used both as a standalone field (with its own label)
 * and inside compact two-column rows where the label is rendered externally.
 * If `label` is omitted (or `hideLabel` is true), the internal label spacing is removed
 * so it visually matches sibling 44px input/select fields.
 */
type Props = {
  label?: string;
  value?: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void; // pass "" to clear
  allowClear?: boolean;
  editable?: boolean;
  placeholder?: string;

  // Optional styling hooks for compact layouts.
  hideLabel?: boolean;
  wrapStyle?: ViewStyle;
  fieldStyle?: ViewStyle;
  textStyle?: TextStyle;
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatUK(value?: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function safeDate(value?: string) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default function DateField({
  label,
  value,
  onChange,
  editable = true,
  placeholder = "dd/mm/yyyy",
  hideLabel,
  wrapStyle,
  fieldStyle,
  textStyle,
  allowClear = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => safeDate(value));

  const display = useMemo(() => (value ? formatUK(value) : ""), [value]);

  // If no label is provided, we default to hiding it (compact mode).
  const shouldHideLabel = hideLabel ?? !label;

  return (
    <View style={[styles.wrap, shouldHideLabel && styles.wrapCompact, wrapStyle]}>
      {!shouldHideLabel ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!editable}
        onPress={() => {
          setTempDate(safeDate(value));
          setOpen(true);
        }}
        style={[
          styles.field,
          shouldHideLabel && styles.fieldCompact,
          !editable && styles.disabled,
          fieldStyle,
        ]}
      >
        <Text style={[styles.text, shouldHideLabel && styles.textCompact, !display && styles.placeholder, textStyle]}>
          {display || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.sheet}>
            <View style={styles.header}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setOpen(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <Text style={styles.headerText}>{label || "Due date"}</Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  onChange(toISODate(tempDate));
                  setOpen(false);
                }}
                style={styles.doneBtn}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>

            {allowClear && editable && !!value ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearText}>Remove date</Text>
              </TouchableOpacity>
            ) : null}

            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(_, selected) => {
                if (!selected) return;

                setTempDate(selected);

                // Android: commit immediately on selection
                if (Platform.OS !== "ios") {
                  onChange(toISODate(selected));
                  setOpen(false);
                }
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Default (standalone) spacing.
  wrap: { marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "800", marginBottom: 6, color: "#111827" },

  field: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },

  // Compact mode: no external spacing, fixed height, and horizontal padding to match sibling fields.
  wrapCompact: { marginBottom: 0 },
  fieldCompact: {
    height: 44,
    paddingVertical: 0,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  textCompact: { fontWeight: "800" },

  disabled: { opacity: 0.5, backgroundColor: "#F3F4F6" },
  text: { fontSize: 14, fontWeight: "700", color: "#111827" },
  placeholder: { color: "#6B7280" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
    padding: 16,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerText: { flex: 1, textAlign: "center", fontSize: 14, fontWeight: "900", color: "#111827" },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  cancelText: { fontSize: 13, fontWeight: "900", color: "#111827" },
  clearBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  clearText: { fontSize: 13, fontWeight: "900", color: "#991B1B" },
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  doneText: { fontSize: 13, fontWeight: "900", color: "#111827" },
});
