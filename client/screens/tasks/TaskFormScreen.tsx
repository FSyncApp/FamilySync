/** FS PATCH: Tasks v1.10 — existing task opens locked; Back|Edit → Cancel|Save; header delete */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { Switch } from "react-native";

import DateField from "../../components/DateField";
import { deleteTask, getTaskById, upsertTask } from "../../data/tasksStore";

const vars = {
  surface: "#FFFFFF",
  surface2: "#F3F4F6",
  border: "rgba(0,0,0,0.08)",
  text: "#111827",
  textMuted: "#6B7280",
  danger: "#DC2626",
  iosBlue: "#007AFF",
};

type AssigneePreset = "__UNASSIGNED__" | "__ALL__" | "__OTHER__:";

const ASSIGNEE_OPTIONS: Array<{ key: AssigneePreset; label: string }> = [
  { key: "__UNASSIGNED__", label: "Unassigned" },
  { key: "__ALL__", label: "All" },
  { key: "__OTHER__:", label: "Other…" },
];

function normaliseAssignedTo(value: string, otherName: string): string {
  if (!value) return "__UNASSIGNED__";
  if (value === "__OTHER__:") {
    const name = (otherName ?? "").trim();
    return name ? `__OTHER__:${name}` : "__OTHER__:";
  }
  return value;
}

function displayAssignedTo(value: string): string {
  if (!value) return "Unassigned";
  if (value === "__UNASSIGNED__") return "Unassigned";
  if (value === "__ALL__") return "All";
  if (value.startsWith("__OTHER__:")) {
    const name = value.replace("__OTHER__:", "").trim();
    return name ? name : "Other…";
  }
  if (value === "__OTHER__:") return "Other…";
  return value;
}

export default function TaskFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const routeMode: "create" | "edit" | undefined = route?.params?.mode;
  const taskId: string | undefined = route?.params?.taskId;
  const isEdit = routeMode === "edit" || !!taskId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState<boolean>(false);

  // View/Edit mode: existing tasks open locked until user taps "Edit"
  const [isLocked, setIsLocked] = useState<boolean>(isEdit);

  // Snapshot so Cancel restores original values
  const [snapshot, setSnapshot] = useState<{
    title: string;
    notes: string;
    assignedTo: string;
    otherName: string;
    dueISO: string | null;
    calendarSyncRequested: boolean;
    reminderEnabled: boolean;
    reminderDaysBefore: number | null;
  } | null>(null);

  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [assignedTo, setAssignedTo] = useState<string>("__UNASSIGNED__");
  const [otherName, setOtherName] = useState<string>("");

  const [dueISO, setDueISO] = useState<string | null>(null);

  const [calendarSyncRequested, setCalendarSyncRequested] = useState<boolean>(false);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number | null>(null);

  const [assigneeOpen, setAssigneeOpen] = useState<boolean>(false);
  const [reminderPickerOpen, setReminderPickerOpen] = useState<boolean>(false);

  const canSave = title.trim().length > 0;
  const hasDue = !!dueISO;
  const isEditable = !isEdit || !isLocked;

  const reminderOptions = useMemo(() => [0, 1, 2, 3, 5, 7, 14], []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? "Task" : "New task",
      headerRight: isEdit
        ? () => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Delete task"
              onPress={confirmDelete}
              disabled={saving || !isLocked}
              activeOpacity={0.85}
              style={{ paddingHorizontal: 10, paddingVertical: 6, opacity: saving || !isLocked ? 0.35 : 1 }}
            >
              <Ionicons name="trash-outline" size={20} color={vars.danger} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, isEdit, confirmDelete, saving, isLocked]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!isEdit || !taskId) return;

      try {
        setLoading(true);
        const row = await getTaskById(taskId);
        if (!alive) return;

        if (!row) {
          Alert.alert("Not found", "This task no longer exists.");
          navigation.goBack();
          return;
        }

        setTitle(row.title ?? "");
        setNotes((row.notes as any) ?? "");

        const a = (row.assigned_to as any) ?? "";
        setAssignedTo(String(a ?? ""));

        // Extract other name from stored "__OTHER__:Name"
        const other = String(a ?? "").startsWith("__OTHER__:") ? String(a ?? "").replace("__OTHER__:", "") : "";
        setOtherName(other);

        setDueISO((row.due_date as any) ?? null);

        setCalendarSyncRequested(!!row.calendar_sync_requested);
        setReminderEnabled(!!row.reminder_enabled);
        setReminderDaysBefore((row.reminder_days_before as any) ?? null);

        setIsLocked(true);
        setSnapshot({
          title: row.title ?? "",
          notes: (row.notes as any) ?? "",
          assignedTo: String(a ?? ""),
          otherName: String(a ?? "").startsWith("__OTHER__:") ? String(a).replace("__OTHER__:", "") : "",
          dueISO: (row.due_date as any) ?? null,
          calendarSyncRequested: !!row.calendar_sync_requested,
          reminderEnabled: !!row.reminder_enabled,
          reminderDaysBefore: (row.reminder_days_before as any) ?? null,
        });
      } catch (e: any) {
        Alert.alert("Couldn’t load", e?.message ?? "Unknown error");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [isEdit, taskId, navigation]);

  const onBack = useCallback(() => {
    if (saving) return;
    navigation.goBack();
  }, [navigation, saving]);

  const onEnterEdit = useCallback(() => {
    if (!isEdit) return;
    if (saving) return;
    setIsLocked(false);
  }, [isEdit, saving]);

  const onCancelEdit = useCallback(() => {
    if (!isEdit) return;
    if (saving) return;

    if (snapshot) {
      setTitle(snapshot.title);
      setNotes(snapshot.notes);
      setAssignedTo(snapshot.assignedTo);
      setOtherName(snapshot.otherName);
      setDueISO(snapshot.dueISO);
      setCalendarSyncRequested(snapshot.calendarSyncRequested);
      setReminderEnabled(snapshot.reminderEnabled);
      setReminderDaysBefore(snapshot.reminderDaysBefore);
    }

    setAssigneeOpen(false);
    setReminderPickerOpen(false);
    setIsLocked(true);
  }, [isEdit, saving, snapshot]);

  const confirmDelete = useCallback(() => {
    Alert.alert("Delete task?", "This can’t be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!taskId) return;
          try {
            setSaving(true);
            await deleteTask(taskId);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert("Couldn’t delete", e?.message ?? "Unknown error");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [navigation, taskId]);

  const openAssignee = useCallback(() => {
    if (saving) return;
    if (!isEditable) return;
    setAssigneeOpen(true);
  }, [saving, isEditable]);

  const chooseAssignee = useCallback(
    (value: string) => {
      setAssignedTo(value);

      if (value === "__OTHER__:") {
        if (!otherName) setOtherName("");
      } else {
        // If user picks a preset, clear other name (visual)
        if (value !== assignedTo && assignedTo.startsWith("__OTHER__:")) {
          setOtherName("");
        }
      }

      setAssigneeOpen(false);
    },
    [assignedTo, otherName]
  );

  const onToggleCalendar = useCallback(
    (v: boolean) => {
      if (!hasDue) return;
      if (!isEditable) return;
      setCalendarSyncRequested(v);
    },
    [hasDue, isEditable]
  );

  const onToggleReminder = useCallback(
    (v: boolean) => {
      if (!hasDue) return;
      if (!isEditable) return;

      setReminderEnabled(v);
      if (v) {
        if (reminderDaysBefore == null) setReminderDaysBefore(1);
      } else {
        setReminderDaysBefore(null);
        setReminderPickerOpen(false);
      }
    },
    [hasDue, isEditable, reminderDaysBefore]
  );

  const onSave = useCallback(async () => {
    if (isEdit && isLocked) return;
    if (!canSave || saving) return;

    const titleTrim = title.trim();

    try {
      setSaving(true);

      const assignedFinal = normaliseAssignedTo(assignedTo, otherName);

      await upsertTask({
        id: taskId,
        title: titleTrim,
        notes: notes ?? "",
        due_date: dueISO,
        assigned_to: assignedFinal,
        calendar_sync_requested: hasDue ? calendarSyncRequested : false,
        reminder_enabled: hasDue ? reminderEnabled : false,
        reminder_days_before: hasDue && reminderEnabled ? reminderDaysBefore : null,
      });

      if (isEdit) {
        setSnapshot({
          title: titleTrim,
          notes: notes ?? "",
          assignedTo: assignedFinal,
          otherName,
          dueISO: dueISO ?? null,
          calendarSyncRequested: !!dueISO ? calendarSyncRequested : false,
          reminderEnabled: !!dueISO ? reminderEnabled : false,
          reminderDaysBefore: !!dueISO && reminderEnabled ? reminderDaysBefore : null,
        });
        setIsLocked(true);
        setAssigneeOpen(false);
        setReminderPickerOpen(false);
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert("Couldn’t save", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }, [
    taskId,
    title,
    notes,
    dueISO,
    assignedTo,
    otherName,
    calendarSyncRequested,
    reminderEnabled,
    reminderDaysBefore,
    hasDue,
    canSave,
    saving,
    isEdit,
    isLocked,
    navigation,
  ]);

  const onReminderPick = useCallback(
    (days: number) => {
      setReminderDaysBefore(days);
      setReminderPickerOpen(false);
    },
    [setReminderDaysBefore]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Task</Text>

          <TextInput
            style={[styles.input, styles.titleInput]}
            placeholder="What needs doing?"
            value={title}
            onChangeText={setTitle}
            editable={isEditable}
            returnKeyType="done"
          />

          <View style={styles.chipsWrap}>
            {["Put bins out", "Book dentist", "Pay council tax", "Call school", "Order prescriptions"].map((t) => (
              <TouchableOpacity key={t} activeOpacity={0.85} onPress={() => (isEditable ? setTitle(t) : null)} style={styles.chip}>
                <Text style={styles.chipText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Notes</Text>

          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Anything useful..."
            value={notes}
            onChangeText={setNotes}
            editable={isEditable}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.divider} />

          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Assign to</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={openAssignee} style={styles.selectRow}>
                <Text style={styles.selectText}>{displayAssignedTo(assignedTo)}</Text>
                <Ionicons name="chevron-forward" size={18} color={vars.textMuted} />
              </TouchableOpacity>

              {String(assignedTo ?? "").startsWith("__OTHER__:") || assignedTo === "__OTHER__:" ? (
                <TextInput
                  style={[styles.input, styles.otherInput]}
                  placeholder="Enter name"
                  value={otherName}
                  onChangeText={setOtherName}
                  editable={isEditable}
                  returnKeyType="done"
                />
              ) : null}
            </View>

            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Due date</Text>
              <DateField editable={isEditable} valueISO={dueISO} onChangeISO={setDueISO} placeholder="dd/mm/yyyy" />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Sync to calendar</Text>
            <Switch
              value={hasDue ? calendarSyncRequested : false}
              onValueChange={onToggleCalendar}
              disabled={!hasDue || !isEditable}
              trackColor={{ false: "rgba(209,213,219,0.9)", true: vars.iosBlue }}
              ios_backgroundColor="rgba(209,213,219,0.9)"
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Set reminder</Text>
            <Switch
              value={hasDue ? reminderEnabled : false}
              onValueChange={onToggleReminder}
              disabled={!hasDue || !isEditable}
              trackColor={{ false: "rgba(209,213,219,0.9)", true: vars.iosBlue }}
              ios_backgroundColor="rgba(209,213,219,0.9)"
            />
          </View>

          {hasDue && reminderEnabled ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => (isEditable ? setReminderPickerOpen(true) : null)}
              style={styles.reminderPill}
            >
              <Ionicons name="time-outline" size={16} color={vars.textMuted} />
              <Text style={styles.reminderText}>
                {reminderDaysBefore === 0 ? "On the day" : `${reminderDaysBefore ?? 1} day(s) before`}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {!isEdit ? (
          <>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onBack}
              disabled={saving}
              style={[styles.bottomBtn, styles.ghostBtn]}
            >
              <Text style={styles.ghostText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onSave}
              disabled={!canSave || saving}
              style={[styles.bottomBtn, (!canSave || saving) && styles.bottomBtnDisabled]}
            >
              <Text style={styles.bottomText}>Add task</Text>
            </TouchableOpacity>
          </>
        ) : isLocked ? (
          <>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onBack}
              disabled={saving}
              style={[styles.bottomBtn, styles.ghostBtn]}
            >
              <Text style={styles.ghostText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={onEnterEdit} disabled={saving} style={[styles.bottomBtn]}>
              <Text style={styles.bottomText}>Edit</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onCancelEdit}
              disabled={saving}
              style={[styles.bottomBtn, styles.ghostBtn]}
            >
              <Text style={styles.ghostText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onSave}
              disabled={!canSave || saving}
              style={[styles.bottomBtn, (!canSave || saving) && styles.bottomBtnDisabled]}
            >
              <Text style={styles.bottomText}>Save</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Assignee picker */}
      <Modal visible={assigneeOpen} animationType="slide" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => setAssigneeOpen(false)} style={styles.modalBackdrop}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Assign to</Text>

            {ASSIGNEE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.85}
                style={styles.modalRow}
                onPress={() => chooseAssignee(opt.key)}
              >
                <Text style={styles.modalRowText}>{opt.label}</Text>
                {assignedTo === opt.key ? <Ionicons name="checkmark" size={18} color={vars.iosBlue} /> : null}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Reminder picker */}
      <Modal visible={reminderPickerOpen} animationType="fade" transparent>
        <TouchableOpacity activeOpacity={1} onPress={() => setReminderPickerOpen(false)} style={styles.modalBackdrop}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Reminder</Text>

            {reminderOptions.map((d) => (
              <TouchableOpacity key={d} activeOpacity={0.85} style={styles.modalRow} onPress={() => onReminderPick(d)}>
                <Text style={styles.modalRowText}>{d === 0 ? "On the day" : `${d} day(s) before`}</Text>
                {reminderDaysBefore === d ? <Ionicons name="checkmark" size={18} color={vars.iosBlue} /> : null}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: vars.textMuted },

  scrollContent: { padding: 16, paddingBottom: 120 },

  card: {
    backgroundColor: vars.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: vars.border,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: vars.text,
  },

  input: {
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: vars.surface2,
    color: vars.text,
  },

  titleInput: { marginBottom: 12 },

  notesInput: { minHeight: 96 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: vars.surface2,
    borderColor: vars.border,
    borderWidth: 1,
    borderRadius: 999,
  },

  chipText: { fontWeight: "600", color: vars.text },

  divider: { height: 1, backgroundColor: vars.border, marginVertical: 14 },

  twoColRow: { flexDirection: "row", gap: 12 },

  col: { flex: 1 },

  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: vars.surface2,
    minHeight: 44,
  },

  selectText: { fontSize: 16, fontWeight: "700", color: vars.text },

  otherInput: { marginTop: 10 },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },

  toggleLabel: { fontSize: 16, fontWeight: "700", color: vars.text },

  reminderPill: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: vars.surface2,
    alignSelf: "flex-start",
  },

  reminderText: { color: vars.text, fontWeight: "600" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: vars.surface,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: vars.border,
  },

  bottomBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  ghostBtn: {
    backgroundColor: vars.surface2,
    borderWidth: 1,
    borderColor: vars.border,
  },

  ghostText: { fontSize: 16, fontWeight: "700", color: vars.text },

  bottomText: { fontSize: 16, fontWeight: "800", color: vars.text },

  bottomBtnDisabled: { opacity: 0.55 },

  deleteBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },

  deleteText: { color: vars.danger, fontWeight: "700" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },

  modalSheet: {
    backgroundColor: vars.surface,
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderTopColor: vars.border,
  },

  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10, color: vars.text },

  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },

  modalRowText: { fontSize: 16, fontWeight: "700", color: vars.text },
});
