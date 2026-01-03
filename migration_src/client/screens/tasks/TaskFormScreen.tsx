/** FS PATCH: Task form — fix store import (no useTasksStore), align Assign/Due row, iOS Switch toggles + reminder picker */
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
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import DateField from "../../components/DateField";
import { deleteTask, getTaskById, upsertTask } from "../../data/tasksStore";

const vars = {
  bg: "#F5F6F8",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(230,232,238,0.75)",
  ink: "#111827",
  inkMuted: "#6B7280",
  danger: "#DC2626",
  iosBlue: "#0A84FF",
};

const STARTER_TASKS = [
  "Put bins out",
  "Book dentist",
  "Pay council tax",
  "Call school",
  "Order prescriptions",
];

function formatAssigneeLabel(v: string | null) {
  if (!v) return "Unassigned";
  if (v === "__ALL__") return "All";
  if (v.startsWith("__OTHER__:")) {
    const name = v.replace("__OTHER__:", "").trim();
    return name ? name : "Other…";
  }
  if (v === "__OTHER__:") return "Other…";
  return v;
}

export default function TaskFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const taskId: string | undefined = route?.params?.taskId;
  const isEdit = !!taskId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(!isEdit);

  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Assignee: "" (unassigned) | "__ALL__" | "__OTHER__:Free text" | free text
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [otherName, setOtherName] = useState<string>("");

  // Due date stored as YYYY-MM-DD
  const [dueISO, setDueISO] = useState<string | null>(null);

  // Intent-only flags
  const [calendarSyncRequested, setCalendarSyncRequested] = useState<boolean>(false);

  // Reminder intent
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number | null>(null);

  // Modals
  const [assigneeOpen, setAssigneeOpen] = useState<boolean>(false);
  const [reminderPickerOpen, setReminderPickerOpen] = useState<boolean>(false);

  const reminderOptions = [0, 1, 2, 3, 7, 14];

  const hasDue = !!dueISO;

  const canSave = useMemo(() => {
    if (saving) return false;
    if (!title.trim()) return false;

    // If user chose Other, require a name (otherwise treat as unassigned)
    if (assignedTo === "__OTHER__:" && !otherName.trim()) return true;

    return true;
  }, [saving, title, assignedTo, otherName]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? "Task" : "New task",
      headerRight: isEdit ? () => (
        <TouchableOpacity onPress={confirmDelete} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Ionicons name="trash-outline" size={22} color={vars.danger} />
        </TouchableOpacity>
      ) : undefined,
    });
  }, [navigation, isEdit, confirmDelete]);

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

        // Extract other name if stored as "__OTHER__:Name"
        if (String(a ?? "").startsWith("__OTHER__:")) {
          const nm = String(a).replace("__OTHER__:", "");
          setOtherName(nm);
        } else {
          setOtherName("");
        }

        setDueISO((row.due_date as any) ?? null);

        setCalendarSyncRequested(!!row.calendar_sync_requested);
        setReminderEnabled(!!row.reminder_enabled);
        setReminderDaysBefore((row.reminder_days_before as any) ?? null);
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
    // Existing tasks open in view-mode until user taps Edit.
    if (isEdit && !isEditing) return;
    setAssigneeOpen(true);
  }, [saving, isEdit, isEditing]);

  const chooseAssignee = useCallback(
    (value: string) => {
      setAssignedTo(value);

      if (value === "__OTHER__:") {
        if (!otherName) setOtherName("");
      } else {
        setOtherName("");
      }

      setAssigneeOpen(false);
    },
    [otherName]
  );

  const onSave = useCallback(async () => {
    if (!canSave || saving) return;

    const titleTrim = title.trim();
    if (!titleTrim) return;

    const assigned =
      assignedTo.trim() === ""
        ? null
        : assignedTo.trim().startsWith("__OTHER__:")
          ? otherName.trim()
            ? `__OTHER__:${otherName.trim()}`
            : null
          : assignedTo.trim();

    try {
      setSaving(true);

      await upsertTask({
        id: taskId,
        title: titleTrim,
        notes: notes.trim() ? notes.trim() : null,
        assigned_to: assigned,
        due_date: dueISO ?? null,
        calendar_sync_requested: !!dueISO ? calendarSyncRequested : false,
        reminder_enabled: !!dueISO ? reminderEnabled : false,
        reminder_days_before: !!dueISO && reminderEnabled ? reminderDaysBefore : null,
      });

      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Couldn’t save", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    saving,
    taskId,
    title,
    notes,
    assignedTo,
    otherName,
    dueISO,
    calendarSyncRequested,
    reminderEnabled,
    reminderDaysBefore,
    navigation,
  ]);

  const assigneeLabel = useMemo(() => {
    const v = assignedTo.startsWith("__OTHER__:") ? `__OTHER__:${otherName}` : assignedTo || null;
    return formatAssigneeLabel(v);
  }, [assignedTo, otherName]);

  const reminderLabel = useMemo(() => {
    if (!hasDue || !reminderEnabled) return null;
    if (reminderDaysBefore === null) return "Pick a reminder…";
    if (reminderDaysBefore === 0) return "On the day";
    return `${reminderDaysBefore} day${reminderDaysBefore === 1 ? "" : "s"} before`;
  }, [hasDue, reminderEnabled, reminderDaysBefore]);

  const onToggleReminder = useCallback(
    (v: boolean) => {
      if (!hasDue) return;

      if (!v) {
        setReminderEnabled(false);
        setReminderDaysBefore(null);
        setReminderPickerOpen(false);
        return;
      }

      setReminderEnabled(true);
      setReminderPickerOpen(true);
    },
    [hasDue]
  );

  const onToggleCalendar = useCallback(
    (v: boolean) => {
      if (!hasDue) return;
      setCalendarSyncRequested(v);
    },
    [hasDue]
  );

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Task</Text>
          <TextInput
            value={title}
            onChangeText={setTitle} editable={isEditing}
            placeholder="What needs doing?"
            placeholderTextColor="rgba(107,114,128,0.85)"
            style={styles.input}
            autoCapitalize="sentences"
            returnKeyType="done"
          />

          {!isEdit && title.trim().length === 0 ? (
            <View style={styles.chipsWrap}>
              <View style={styles.chipsRow}>
                {STARTER_TASKS.map((t) => (
                  <TouchableOpacity key={t} activeOpacity={0.85} style={styles.chip} onPress={() => setTitle(t)}>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes} editable={isEditing}
            placeholder="Anything useful…"
            placeholderTextColor="rgba(107,114,128,0.85)"
            style={[styles.input, styles.notes]}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.divider} />

          {/* Assign + Due (single row, forced equal field heights) */}
          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <Text style={styles.label}>Assign to</Text>
              <View style={styles.fieldBox}>
                <TouchableOpacity activeOpacity={0.85} onPress={openAssignee} style={styles.selectRow}>
                  <Text style={styles.selectValue} numberOfLines={1}>
                    {assigneeLabel}
                  </Text>
                  <Text style={styles.chev}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Due date</Text>
              <View style={styles.fieldBox}>
                <DateField value={dueISO || undefined} onChange={setDueISO} editable placeholder="dd/mm/yyyy" />
              </View>
            </View>
          </View>

          {assignedTo === "__OTHER__:" ? (
            <View style={{ marginTop: 10 }}>
              <TextInput
                value={otherName}
                onChangeText={setOtherName} editable={isEditing}
                placeholder="Other…"
                placeholderTextColor="rgba(107,114,128,0.85)"
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Toggles (Switch) */}
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Sync to calendar</Text>
            <Switch
              value={hasDue ? calendarSyncRequested : false}
              onValueChange={onToggleCalendar}
              disabled={!hasDue || (isEdit && !isEditing)}
              trackColor={{ false: "rgba(209,213,219,0.9)", true: vars.iosBlue }}
              ios_backgroundColor="rgba(209,213,219,0.9)"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Set reminder</Text>
            <Switch
              value={hasDue ? reminderEnabled : false}
              onValueChange={onToggleReminder}
              disabled={!hasDue || (isEdit && !isEditing)}
              trackColor={{ false: "rgba(209,213,219,0.9)", true: vars.iosBlue }}
              ios_backgroundColor="rgba(209,213,219,0.9)"
            />
          </View>

          {hasDue && reminderEnabled ? (
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setReminderPickerOpen(true)}
                style={styles.reminderSummary}
              >
                <Text style={styles.reminderSummaryLabel}>Reminder</Text>
                <Text style={styles.reminderSummaryValue} numberOfLines={1}>
                  {reminderLabel}
                </Text>
                <Text style={styles.chev}>›</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={{ height: 86 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
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
          onPress={isEdit && !isEditing ? () => setIsEditing(true) : onSave}
          disabled={(isEdit && !isEditing) ? saving : (!canSave || saving)}
          style={[styles.bottomBtn, ((isEdit && !isEditing) ? saving : (!canSave || saving)) && styles.bottomBtnDisabled]}
        >
          <Text style={styles.bottomText}>{isEdit ? (isEditing ? "Save" : "Edit") : "Add task"}</Text>
        </TouchableOpacity>
      </View>

      {/* Assignee picker */}
      <Modal visible={assigneeOpen} transparent animationType="fade" onRequestClose={() => setAssigneeOpen(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setAssigneeOpen(false)} style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign to</Text>

            <TouchableOpacity activeOpacity={0.85} onPress={() => chooseAssignee("")} style={styles.modalRow}>
              <Text style={styles.modalRowText}>Unassigned</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={() => chooseAssignee("__ALL__")} style={styles.modalRow}>
              <Text style={styles.modalRowText}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={() => chooseAssignee("__OTHER__:")} style={styles.modalRow}>
              <Text style={styles.modalRowText}>Other…</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setAssigneeOpen(false)}
              style={[styles.modalRow, styles.modalClose]}
            >
              <Text style={[styles.modalRowText, { fontWeight: "800" }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reminder picker */}
      <Modal visible={reminderPickerOpen} transparent animationType="fade" onRequestClose={() => setReminderPickerOpen(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setReminderPickerOpen(false)} style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reminder</Text>

            {reminderOptions.map((d) => {
              const label = d === 0 ? "On the day" : `${d} day${d === 1 ? "" : "s"} before`;
              const selected = reminderDaysBefore === d;
              return (
                <TouchableOpacity
                  key={String(d)}
                  activeOpacity={0.85}
                  onPress={() => {
                    setReminderEnabled(true);
                    setReminderDaysBefore(d);
                    setReminderPickerOpen(false);
                  }}
                  style={styles.modalRow}
                >
                  <Text style={[styles.modalRowText, selected && { fontWeight: "900" }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setReminderPickerOpen(false)}
              style={[styles.modalRow, styles.modalClose]}
            >
              <Text style={[styles.modalRowText, { fontWeight: "800" }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vars.bg },
  center: { alignItems: "center", justifyContent: "center" },
  loading: { fontSize: 14, fontWeight: "700", color: vars.inkMuted },

  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 22 },

  card: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    padding: 14,
  },

  label: { fontSize: 13, fontWeight: "800", color: vars.ink, marginBottom: 8 },

  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(230,232,238,0.9)",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    color: vars.ink,
  },

  // Slightly smaller than before to keep single-page feel.
  notes: { height: 86, paddingTop: 10 },

  divider: { height: 1, backgroundColor: "rgba(238,240,245,0.9)", marginVertical: 12 },

  chipsWrap: { marginTop: 10 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(238,240,245,0.9)",
    borderWidth: 1,
    borderColor: "rgba(230,232,238,0.9)",
    maxWidth: "100%",
  },
  chipText: { fontSize: 12, fontWeight: "800", color: vars.ink },

  // Ensure both columns align: same label, same field height.
  twoColRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  col: { flex: 1 },
  fieldBox: { height: 44, justifyContent: "center" },

  selectRow: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(230,232,238,0.9)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: { fontSize: 14, fontWeight: "800", color: vars.ink, flex: 1, paddingRight: 10 },
  chev: { fontSize: 18, fontWeight: "900", color: vars.inkMuted },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  reminderSummary: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(230,232,238,0.9)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reminderSummaryLabel: { fontSize: 12, fontWeight: "900", color: vars.inkMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  reminderSummaryValue: { flex: 1, fontSize: 14, fontWeight: "800", color: vars.ink },

  deleteBtn: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.25)",
    backgroundColor: "rgba(220,38,38,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteText: { fontSize: 13, fontWeight: "900", color: vars.danger },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(245,246,248,0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(230,232,238,0.9)",
    flexDirection: "row",
    gap: 10,
  },
  bottomBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnDisabled: { opacity: 0.55 },
  bottomText: { fontSize: 14, fontWeight: "900", color: "white" },

  ghostBtn: { backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(230,232,238,0.9)" },
  ghostText: { fontSize: 14, fontWeight: "900", color: vars.ink },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", padding: 18, justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(230,232,238,0.9)",
    paddingVertical: 10,
    overflow: "hidden",
  },
  modalTitle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: "900",
    color: vars.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  modalRow: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(238,240,245,0.9)" },
  modalRowText: { fontSize: 14, fontWeight: "900", color: vars.ink },
  modalClose: { backgroundColor: "rgba(245,246,248,0.8)" },
});
