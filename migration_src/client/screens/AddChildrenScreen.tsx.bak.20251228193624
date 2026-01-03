import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import DatePickerModal, {
  formatYYYYMMDD,
  parseYYYYMMDD,
} from "../components/DatePickerModal";

type Props = NativeStackScreenProps<RootStackParamList, "AddChildren">;

type ChildDraft = {
  id: string;
  name: string;
  birthday: string; // optional, stored as YYYY-MM-DD
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AddChildrenScreen({ navigation }: Props) {
  const [children, setChildren] = useState<ChildDraft[]>([
    { id: makeId(), name: "", birthday: "" },
  ]);

  const [pickerChildId, setPickerChildId] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerInitialDate, setPickerInitialDate] = useState<Date>(new Date());

  const hasAnyName = useMemo(
    () => children.some((c) => c.name.trim().length > 0),
    [children]
  );

  const onAddAnother = () => {
    setChildren((prev) => [...prev, { id: makeId(), name: "", birthday: "" }]);
  };

  const onUpdate = (id: string, patch: Partial<ChildDraft>) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const onRemove = (id: string) => {
    setChildren((prev) => {
      const next = prev.filter((c) => c.id !== id);
      return next.length ? next : [{ id: makeId(), name: "", birthday: "" }];
    });
  };

  // IMPORTANT: Must match App.tsx screen name exactly
  const goNext = () => navigation.navigate("InviteAdults");

  const onSkip = () => {
    goNext();
  };

  const onContinue = () => {
    const trimmed = children.map((c) => ({
      ...c,
      name: c.name.trim(),
      birthday: c.birthday.trim(),
    }));

    const invalid = trimmed.some(
      (c) => c.name.length === 0 && c.birthday.length > 0
    );

    if (invalid) {
      Alert.alert(
        "Missing child name",
        "If you enter a birthday, please enter the child’s name too."
      );
      return;
    }

    if (!hasAnyName) {
      goNext();
      return;
    }

    // Phase 1: no persistence yet
    goNext();
  };

  const openDobPicker = (childId: string, currentDob: string) => {
    const parsed = parseYYYYMMDD(currentDob);
    setPickerChildId(childId);
    setPickerInitialDate(parsed ?? new Date());
    setPickerVisible(true);
  };

  const closePicker = () => {
    setPickerVisible(false);
    setPickerChildId(null);
  };

  const onConfirmDate = (date: Date) => {
    if (!pickerChildId) return;
    onUpdate(pickerChildId, { birthday: formatYYYYMMDD(date) });
    closePicker();
  };

  const dobLabel = (dob: string) => {
    if (!dob.trim()) return "Birthday (optional)";
    return `Birthday: ${dob.trim()}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Add children</Text>
        <Text style={styles.subtitle}>You can do this now or later.</Text>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {children.map((child, idx) => (
            <View key={child.id} style={styles.card}>
              <Text style={styles.cardTitle}>Child {idx + 1}</Text>

              <TextInput
                placeholder="Name"
                value={child.name}
                onChangeText={(t) => onUpdate(child.id, { name: t })}
                style={styles.input}
                autoCapitalize="words"
              />

              <TouchableOpacity
                style={styles.inputLikeButton}
                activeOpacity={0.85}
                onPress={() => openDobPicker(child.id, child.birthday)}
              >
                <Text
                  style={[
                    styles.inputLikeText,
                    child.birthday.trim()
                      ? styles.inputLikeTextFilled
                      : styles.inputLikeTextPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {dobLabel(child.birthday)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoButton}
                onPress={() =>
                  Alert.alert(
                    "Add photo",
                    "Child photo will be enabled in a later phase."
                  )
                }
              >
                <Text style={styles.photoText}>Add photo (optional)</Text>
              </TouchableOpacity>

              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemove(child.id)}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addAnother} onPress={onAddAnother}>
            <Text style={styles.addAnotherText}>+ Add another child</Text>
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onSkip}>
              <Text style={styles.secondaryText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
              <Text style={styles.primaryText}>Continue</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* CANONICAL date picker (reuse everywhere going forward) */}
        <DatePickerModal
          visible={pickerVisible}
          title="Select birthday"
          initialDate={pickerInitialDate}
          maximumDate={new Date()}
          onCancel={closePicker}
          onConfirm={onConfirmDate}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280", marginBottom: 16 },

  list: { flex: 1 },
  listContent: { paddingBottom: 24 },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 12,
  },

  inputLikeButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    justifyContent: "center",
  },
  inputLikeText: { fontSize: 16 },
  inputLikeTextPlaceholder: { color: "#9CA3AF", fontWeight: "500" },
  inputLikeTextFilled: { color: "#111827", fontWeight: "500" },

  photoButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  photoText: { fontSize: 15, fontWeight: "600", color: "#111827" },

  row: { flexDirection: "row", justifyContent: "flex-end" },
  removeButton: { paddingVertical: 6, paddingHorizontal: 10 },
  removeText: { color: "#6B7280", fontSize: 14, fontWeight: "600" },

  addAnother: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 14,
  },
  addAnotherText: { fontSize: 15, fontWeight: "700", color: "#111827" },

  bottomRow: { flexDirection: "row", gap: 12 },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E8EE",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryText: { color: "#111827", fontSize: 16, fontWeight: "600" },
  primaryButton: {
    flex: 1,
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },

  bottomSpacer: { height: 12 },
});
