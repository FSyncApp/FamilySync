import React, { useState } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

/**
 * DateField
 * - Displays dd/mm/yyyy
 * - Stores date-only ISO: YYYY-MM-DD
 * - Opens a modal picker on iOS so it never renders below the screen
 * - Uses iOS "inline" (calendar) display (falls back gracefully if unsupported)
 */
type Props = {
  label: string;
  value?: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  editable?: boolean;
  placeholder?: string;
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
}: Props) {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => safeDate(value));

  const display = value ? formatUK(value) : "";

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!editable}
        onPress={() => {
          setTempDate(safeDate(value));
          setOpen(true);
        }}
        style={[styles.field, !editable && styles.disabled]}
      >
        <Text style={[styles.text, !display && styles.placeholder]}>
          {display || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerText}>{label}</Text>
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

            <DateTimePicker
              value={tempDate}
              mode="date"
              // iOS calendar-style picker
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
  wrap: { marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "800", marginBottom: 6, color: "#111827" },

  field: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
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
  headerText: { fontSize: 14, fontWeight: "900", color: "#111827" },
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
