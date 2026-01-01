/** FS PATCH: Task form v1.2 — 2-line starter chips + assignee (Unassigned/All/Other) + cleaner toggles + notes moved up */
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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { TasksStackParamList } from "../../navigation/TasksStack";
import { deleteTask, getTaskById, upsertTask } from "../../data/tasksStore";
import DateField from "../../components/DateField";

type Nav = NativeStackNavigationProp<TasksStackParamList>;
type Route = { key: string; name: "TaskForm"; params: { id?: string } };

const vars = {
  bg: "#F5F6F8",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(230,232,238,0.75)",
  ink: "#111827",
  inkMuted: "#6B7280",
  danger: "#DC2626",
};

const STARTER_TASKS = ["Pay invoice", "Call school", "Return parcel", "Pick up meds", "Bins out"];

function formatAssigneeLabel(v: string | null | undefined) {
  if (!v) return "Unassigned";
  if (v === "__ALL__") return "All";
  if (v.startsWith("__OTHER__:")) return v.replace("__OTHER__:", "").trim() || "Other";
  return v;
}

function parseOther(v: string) {
  if (!v.startsWith("__OTHER__:")) return "";
  return v.replace("__OTHER__:", "");
}

function isISODate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export default function TaskFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const taskId = route.params?.id;
  const isEdit = !!taskId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState<boolean>(false);

  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Assignee: "" (unassigned) | "__ALL__" | "__OTHER__:Free text"
  const [assignedTo, setAssignedTo] = useState<string>("");

  // Due date stored as YYYY-MM-DD
  const [dueISO, setDueISO] = useState<string | null>(null);

  // Calendar intent (Phase 2: store only)
  const [calendarSyncRequested, setCalendarSyncRequested] = useState<boolean>(false);

  // Reminders intent (Phase 2: store only)
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(1);

  // Assignee picker modal
  const [assigneeOpen, setAssigneeOpen] = useState<boolean>(false);
  const [otherName, setOtherName] = useState<string>("");

  const canSave = useMemo(() => title.trim().length > 0, [title]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!isEdit) return;
      try {
        const row = await getTaskById(taskId!);
        if (!alive) return;

        if (!row) {
          Alert.alert("Not found", "That task no longer exists.", [{ text: "OK", onPress: () => navigation.goBack() }]);
          return;
        }

        setTitle(String(row.title ?? ""));
        setNotes(String(row.notes ?? ""));

        const a = String(row.assigned_to ?? "");
        setAssignedTo(a);
        setOtherName(a.startsWith("__OTHER__:") ? parseOther(a) : "");

        const d = row.due_date ? String(row.due_date) : null;
        setDueISO(d && isISODate(d) ? d : null);

        setCalendarSyncRequested(Boolean(row.calendar_sync_requested));
        setReminderEnabled(Boolean(row.reminder_enabled));
        setReminderDaysBefore(typeof row.reminder_days_before === "number" ? row.reminder_days_before : 1);
      } catch (e: any) {
        Alert.alert("Couldn’t load", e?.message ?? "Unknown error");
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [isEdit, taskId, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? "Task" : "New task",
    });
  }, [navigation, isEdit]);

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

  const onSave = useCallback(async () => {
    if (!canSave || saving) return;

    const titleTrim = title.trim();
    if (!titleTrim) return;

    const assigned =
      assignedTo.trim() === ""
        ? null
        : assignedTo.trim().startsWith("__OTHER__:")
          ? (otherName.trim() ? `__OTHER__:${otherName.trim()}` : null)
          : assignedTo.trim();

    const hasDue = !!dueISO;

    try {
      setSaving(true);

      await upsertTask({
        id: taskId,
        title: titleTrim,
        notes: notes.trim() ? notes.trim() : null,
        assigned_to: assigned,
        due_date: dueISO ?? null,
        calendar_sync_requested: hasDue ? calendarSyncRequested : false,
        reminder_enabled: hasDue ? reminderEnabled : false,
        reminder_days_before: hasDue && reminderEnabled ? reminderDaysBefore : null,
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

  const openAssignee = useCallback(() => {
    if (saving) return;
    setAssigneeOpen(true);
  }, [saving]);

  const chooseAssignee = useCallback((value: string) => {
    setAssignedTo(value);

    if (value === "__OTHER__:") {
      if (!otherName) setOtherName("");
    } else {
      setOtherName("");
    }
    setAssigneeOpen(false);
  }, [otherName]);

  const reminderOptions = [0, 1, 2, 3, 7, 14];

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  const assigneeLabel = formatAssigneeLabel(
    assignedTo.startsWith("__OTHER__:") ? `__OTHER__:${otherName}` : assignedTo || null
  );

  const hasDue = !!dueISO;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Task</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
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
            onChangeText={setNotes}
            placeholder="Anything useful…"
            placeholderTextColor="rgba(107,114,128,0.85)"
            style={[styles.input, styles.notes]}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.divider} />

          
{/* Assign + Due (single row) */}
<View style={styles.twoColRow}>
  <View style={styles.col}>
    <Text style={styles.label}>Assign to</Text>
    <TouchableOpacity activeOpacity={0.85} onPress={openAssignee} style={styles.selectRow}>
      <Text style={styles.selectValue} numberOfLines={1}>
        {assigneeLabel}
      </Text>
      <Text style={styles.chev}>›</Text>
    </TouchableOpacity>
  
{assignedTo === "__OTHER__:" ? (
  <View style={{ marginTop: 10 }}>
    <TextInput
      value={otherName}
      onChangeText={setOtherName}
      placeholder="Other…"
      placeholderTextColor="rgba(107,114,128,0.85)"
      style={styles.input}
      autoCapitalize="words"
      returnKeyType="done"
    />
  </View>
) : null}
</View>

  <View style={styles.col}>
    <Text style={styles.label}>Due date</Text>
    <View style={styles.dateWrap}>
      <DateField value={dueISO || undefined} onChange={setDueISO} editable placeholder="dd/mm/yyyy" />
    </View>
  </View>
</View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Sync to calendar</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!hasDue}
              onPress={() => hasDue && setCalendarSyncRequested((v) => !v)}
              style={[styles.toggle, hasDue && calendarSyncRequested && styles.toggleOn, !hasDue && styles.toggleDisabled]}
            >
              <View style={[styles.toggleKnob, hasDue && calendarSyncRequested && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Reminders</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!hasDue}
              onPress={() => hasDue && setReminderEnabled((v) => !v)}
              style={[styles.toggle, hasDue && reminderEnabled && styles.toggleOn, !hasDue && styles.toggleDisabled]}
            >
              <View style={[styles.toggleKnob, hasDue && reminderEnabled && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>

          {hasDue && reminderEnabled ? (
            <View style={{ marginTop: 10 }}>
              <View style={styles.pillsRow}>
                {reminderOptions.map((d) => {
                  const label = d === 0 ? "On the day" : `${d}d before`;
                  const selected = reminderDaysBefore === d;
                  return (
                    <TouchableOpacity
                      key={String(d)}
                      activeOpacity={0.85}
                      onPress={() => setReminderDaysBefore(d)}
                      style={[styles.pill, selected && styles.pillOn]}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextOn]} numberOfLines={1}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {isEdit ? (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity activeOpacity={0.85} onPress={confirmDelete} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color={vars.danger} />
                <Text style={styles.deleteText}>Delete task</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={{ height: 86 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity activeOpacity={0.9} onPress={onBack} disabled={saving} style={[styles.bottomBtn, styles.ghostBtn]}>
          <Text style={styles.ghostText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onSave}
          disabled={!canSave || saving}
          style={[styles.bottomBtn, (!canSave || saving) && styles.bottomBtnDisabled]}
        >
          <Text style={styles.bottomText}>{isEdit ? "Save" : "Add task"}</Text>
        </TouchableOpacity>
      </View>

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

            <TouchableOpacity activeOpacity={0.85} onPress={() => setAssigneeOpen(false)} style={[styles.modalRow, styles.modalClose]}>
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
  helper: { fontSize: 12, fontWeight: "600", color: vars.inkMuted },

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

  notes: { height: 92, paddingTop: 10 },

  divider: { height: 1, backgroundColor: "rgba(238,240,245,0.9)", marginVertical: 10 },

  chipsWrap: { marginTop: 10 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(238,240,245,0.9)",
    borderWidth: 1,
    borderColor: "rgba(230,232,238,0.9)",
  },
  chipText: { fontSize: 12, fontWeight: "800", color: vars.ink },

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


twoColRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
col: { flex: 1 },
dateWrap: { marginTop: 0 },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  toggle: {
    width: 56,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(229,231,235,0.95)",
    borderWidth: 1,
    borderColor: "rgba(209,213,219,0.9)",
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: "rgba(17,24,39,0.9)", borderColor: "rgba(17,24,39,0.9)" },
  toggleDisabled: { opacity: 0.5 },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "white",
    alignSelf: "flex-start",
  },
  toggleKnobOn: { alignSelf: "flex-end" },

  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(238,240,245,0.9)",
    borderWidth: 1,
    borderColor: "rgba(230,232,238,0.9)",
  },
  pillOn: { backgroundColor: "rgba(17,24,39,0.9)", borderColor: "rgba(17,24,39,0.9)" },
  pillText: { fontSize: 12, fontWeight: "800", color: vars.ink },
  pillTextOn: { color: "white" },

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
