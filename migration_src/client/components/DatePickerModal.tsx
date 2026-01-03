import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

export function parseYYYYMMDD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

/**
 * Display helpers (Phase 1):
 * - Keep canonical storage as YYYY-MM-DD
 * - Display to users as "DD Mon YYYY" (e.g. 30 Dec 2025)
 * Later: this can be user-configurable in Settings.
 */
export function formatDisplayDMY(d: Date) {
  try {
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${day}-${m}-${y}`;
  }
}

export function formatDisplayFromYYYYMMDD(s: string) {
  const d = parseYYYYMMDD(s);
  if (!d) return s;
  return formatDisplayDMY(d);
}

type Props = {
  visible: boolean;
  title?: string;
  initialDate: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
};

export default function DatePickerModal({
  visible,
  title = "Select date",
  initialDate,
  maximumDate,
  onCancel,
  onConfirm,
}: Props) {
  const [date, setDate] = React.useState<Date>(initialDate);

  React.useEffect(() => {
    if (visible) setDate(initialDate);
  }, [visible, initialDate]);

  const onChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "dismissed") {
        onCancel();
        return;
      }
      if (event.type === "set" && selected) {
        onConfirm(selected);
      }
      return;
    }
    if (selected) setDate(selected);
  };

  const onDone = () => onConfirm(date);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onChange}
              maximumDate={maximumDate}
            />
          </View>

          {Platform.OS === "ios" ? (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondary} onPress={onCancel}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primary} onPress={onDone}>
                <Text style={styles.primaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondary} onPress={onCancel}>
                <Text style={styles.secondaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E6E8EE",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  pickerWrap: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondary: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secondaryText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "700",
  },
  primary: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
