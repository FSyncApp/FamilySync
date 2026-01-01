/** FS PATCH: Task form v1 — create/edit with safe delete + due date + assignee + notes + calendar intent flag */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { TasksStackParamList } from "../../navigation/TasksStack";
import { deleteTask, getTaskById, upsertTask } from "../../data/tasksStore";

type Nav = NativeStackNavigationProp<TasksStackParamList>;
type Route = { params?: { mode: "create" | "edit"; taskId?: string } };

const vars = {
  bg: "#F5F6F8",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(230,232,238,0.75)",
  ink: "#111827",
  inkMuted: "#6B7280",
  danger: "#B91C1C",
};

function isoFromParts(yyyy: string, mm: string, dd: string): string | null {
  const y = Number(yyyy);
  const m = Number(mm);
  const d = Number(dd);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (y < 2000 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  const mm2 = String(m).padStart(2, "0");
  const dd2 = String(d).padStart(2, "0");
  return `${y}-${mm2}-${dd2}`;
}

function partsFromIso(iso?: string | null) {
  if (!iso) return { yyyy: "", mm: "", dd: "" };
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { yyyy: "", mm: "", dd: "" };
  return { yyyy: m[1], mm: m[2], dd: m[3] };
}

export default function TaskFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute() as Route;

  const mode = route?.params?.mode ?? "create";
  const taskId = route?.params?.taskId;

  const isEdit = mode === "edit" && !!taskId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState<boolean>(false);

  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  const [dueYYYY, setDueYYYY] = useState<string>("");
  const [dueMM, setDueMM] = useState<string>("");
  const [dueDD, setDueDD] = useState<string>("");

  const dueISO = useMemo(() => isoFromParts(dueYYYY.trim(), dueMM.trim(), dueDD.trim()), [dueYYYY, dueMM, dueDD]);

  const [calendarSyncRequested, setCalendarSyncRequested] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!isEdit) return;
      try {
        const row = await getTaskById(taskId!);
        if (!alive) return;
        if (!row) {
          Alert.alert("Not found", "This task no longer exists.");
          navigation.goBack();
          return;
        }

        setTitle(row.title ?? "");
        setNotes(row.notes ?? "");
        setAssignedTo(row.assigned_to ?? "");

        const p = partsFromIso(row.due_date ?? null);
        setDueYYYY(p.yyyy);
        setDueMM(p.mm);
        setDueDD(p.dd);

        setCalendarSyncRequested(Boolean(row.calendar_sync_requested));
      } catch (e: any) {
        Alert.alert("Couldn’t load", e?.message ?? "Please try again.");
        navigation.goBack();
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [isEdit, taskId, navigation]);

  const onSave = useCallback(async () => {
    if (saving) return;

    const t = title.trim();
    if (!t) {
      Alert.alert("Task title required", "Please enter a title.");
      return;
    }

    const anyDatePart = Boolean(dueYYYY.trim() || dueMM.trim() || dueDD.trim());
    if (anyDatePart && !dueISO) {
      Alert.alert("Check the due date", "Enter a full date as YYYY / MM / DD, or clear it.");
      return;
    }

    setSaving(true);
    try {
      await upsertTask({
        id: isEdit ? taskId : undefined,
        title: t,
        notes: notes.trim() ? notes.trim() : null,
        assigned_to: assignedTo.trim() ? assignedTo.trim() : null,
        due_date: dueISO ?? null,
        calendar_sync_requested: dueISO ? calendarSyncRequested : false,
      });

      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Couldn’t save", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }, [saving, title, notes, assignedTo, dueYYYY, dueMM, dueDD, dueISO, calendarSyncRequested, isEdit, taskId, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? "Edit task" : "Add task",
      headerRight: () => (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={saving}
          onPress={() => onSave()}
          activeOpacity={0.85}
          style={[styles.headerBtn, saving && { opacity: 0.7 }]}
        >
          <Text style={styles.headerBtnText}>{saving ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isEdit, saving, onSave]);

  const onDelete = useCallback(() => {
    if (!isEdit) return;

    Alert.alert("Delete task?", "This can’t be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTask(taskId!);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert("Couldn’t delete", e?.message ?? "Please try again.");
          }
        },
      },
    ]);
  }, [isEdit, taskId, navigation]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Task</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Tip run"
            placeholderTextColor="rgba(107,114,128,0.85)"
            style={styles.input}
            autoCapitalize="sentences"
            returnKeyType="done"
          />

          <View style={styles.divider} />

          <Text style={styles.label}>Assigned to (optional)</Text>
          <TextInput
            value={assignedTo}
            onChangeText={setAssignedTo}
            placeholder="Type a name (family member or other)"
            placeholderTextColor="rgba(107,114,128,0.85)"
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <View style={styles.divider} />

          <Text style={styles.label}>Due date (optional)</Text>
          <View style={styles.dateRow}>
            <TextInput
              value={dueYYYY}
              onChangeText={(v) => setDueYYYY(v.replace(/[^0-9]/g, "").slice(0, 4))}
              placeholder="YYYY"
              placeholderTextColor="rgba(107,114,128,0.85)"
              style={[styles.input, styles.datePart, { flex: 1.4 }]}
              keyboardType="number-pad"
              returnKeyType="done"
            />
            <TextInput
              value={dueMM}
              onChangeText={(v) => setDueMM(v.replace(/[^0-9]/g, "").slice(0, 2))}
              placeholder="MM"
              placeholderTextColor="rgba(107,114,128,0.85)"
              style={[styles.input, styles.datePart, { flex: 1 }]}
              keyboardType="number-pad"
              returnKeyType="done"
            />
            <TextInput
              value={dueDD}
              onChangeText={(v) => setDueDD(v.replace(/[^0-9]/g, "").slice(0, 2))}
              placeholder="DD"
              placeholderTextColor="rgba(107,114,128,0.85)"
              style={[styles.input, styles.datePart, { flex: 1 }]}
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>

          {dueISO ? (
            <View style={styles.calendarRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Calendar</Text>
                <Text style={styles.helper} numberOfLines={2}>
                  If enabled, we’ll add this task to your calendar once calendar sync is implemented.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setCalendarSyncRequested((v) => !v)}
                style={[styles.toggle, calendarSyncRequested && styles.toggleOn]}
                accessibilityRole="button"
                accessibilityLabel={calendarSyncRequested ? "Calendar sync requested" : "Calendar sync not requested"}
              >
                <Ionicons
                  name={calendarSyncRequested ? "checkmark" : "add"}
                  size={16}
                  color={calendarSyncRequested ? "#FFFFFF" : vars.ink}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.helper} numberOfLines={2}>
              Add a due date to enable the calendar option.
            </Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything useful…"
            placeholderTextColor="rgba(107,114,128,0.85)"
            style={[styles.input, styles.notes]}
            multiline
          />
        </View>

        {isEdit ? (
          <TouchableOpacity onPress={onDelete} activeOpacity={0.85} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={vars.danger} />
            <Text style={styles.deleteText}>Delete task</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vars.bg },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22 },

  card: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  label: { fontSize: 12, lineHeight: 15, fontWeight: "800", color: vars.inkMuted, marginBottom: 6 },

  input: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: vars.ink,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(230,232,238,0.9)",
    backgroundColor: "rgba(255,255,255,0.9)",
  },

  notes: { minHeight: 96, textAlignVertical: "top" },

  divider: { height: 1, backgroundColor: "rgba(238,240,245,0.9)", marginVertical: 14 },

  dateRow: { flexDirection: "row", gap: 10 },
  datePart: { textAlign: "center" },

  helper: { marginTop: 8, fontSize: 12, lineHeight: 16, fontWeight: "600", color: vars.inkMuted },

  calendarRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },

  toggle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: vars.ink, borderColor: "rgba(17,24,39,0.2)" },

  deleteBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.35)",
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  deleteText: { fontSize: 13, lineHeight: 16, fontWeight: "800", color: vars.danger },

  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: vars.border,
  },
  headerBtnText: { fontSize: 13, lineHeight: 16, fontWeight: "800", color: vars.ink },

  center: { alignItems: "center", justifyContent: "center" },
  muted: { fontSize: 13, lineHeight: 16, fontWeight: "700", color: vars.inkMuted },
});
