import React, { useMemo, useState } from "react";
import { Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

/**
 * DateField
 * - Displays dd/mm/yyyy
 * - Stores date-only ISO: YYYY-MM-DD
 * - Opens a modal picker on iOS so it never renders "below" the screen
 * - Falls back to typed dd/mm/yyyy if DateTimePicker isn't installed
 */
type Props = {
  label: string;
  value?: string; // YYYY-MM-DD (preferred) or ISO string
  onChange: (isoDate: string) => void;
  editable?: boolean;
  placeholder?: string; // dd/mm/yyyy
};

function toISODate(d: Date) {
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatUK(value?: string) {
  if (!value) return "";
  const iso = value.slice(0, 10);
  const parts = iso.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function parseUK(text: string) {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

export default function DateField({ label, value, onChange, editable = true, placeholder = "dd/mm/yyyy" }: Props) {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => {
    const d = value ? new Date(value) : new Date();
    return Number.isNaN(d.getTime()) ? new Date() : d;
  });

  const DateTimePicker = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("@react-native-community/datetimepicker");
      return mod.default ?? mod;
    } catch {
      return null;
    }
  }, []);

  const display = formatUK(value);

  if (!DateTimePicker) {
    return (
      <View style={s.wrap}>
        <Text style={s.label}>{label}</Text>
        <TextInput
          value={display}
          placeholder={placeholder}
          editable={editable}
          onChangeText={(t) => {
            const iso = parseUK(t);
            if (iso) onChange(iso);
          }}
          style={[s.input, !editable && s.disabled]}
        />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (!editable) return;
          const d = value ? new Date(value) : new Date();
          setTempDate(Number.isNaN(d.getTime()) ? new Date() : d);
          setOpen(true);
        }}
        style={[s.pill, !editable && s.disabled]}
      >
        <Text style={[s.pillText, !display && s.placeholder]}>{display || placeholder}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setOpen(false)} style={s.backdrop}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{label}</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  onChange(toISODate(tempDate));
                  setOpen(false);
                }}
                style={s.doneBtn}
              >
                <Text style={s.doneText}>Done</Text>
              </TouchableOpacity>
            </View>

            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_evt: any, selected?: Date) => {
                if (!selected) return;
                setTempDate(selected);
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

const vars = {
  ink: "#111827",
  inkMuted: "#6B7280",
  border: "#E5E7EB",
  bg: "#FFFFFF",
  bgDisabled: "#F3F4F6",
};

const s = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "800", color: vars.ink, marginBottom: 6 },

  input: {
    backgroundColor: vars.bg,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    color: vars.ink,
  },

  pill: {
    backgroundColor: vars.bg,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pillText: { fontSize: 14, fontWeight: "700", color: vars.ink },
  placeholder: { color: vars.inkMuted },
  disabled: { opacity: 0.5, backgroundColor: vars.bgDisabled },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 16,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vars.border,
    padding: 12,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sheetTitle: { fontSize: 14, fontWeight: "900", color: vars.ink },
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "#FFFFFF",
  },
  doneText: { fontSize: 13, fontWeight: "900", color: vars.ink },
});
