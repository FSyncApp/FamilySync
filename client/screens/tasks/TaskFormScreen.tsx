
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
import { getUserSettings } from "../../data/settingsStore";  // Assuming we have a function to fetch user settings

// Using absolute path for styles import
import { styles } from "/client/styles";  // Absolute path import to avoid relative path issues

const vars = {
  surface: "#FFFFFF",
  surface2: "#F3F4F6",
  border: "rgba(0,0,0,0.08)",
  text: "#111827",
  textMuted: "#6B7280",
  danger: "#DC2626",
  iosBlue: "#007AFF",
};

function normaliseAssignedTo(value, otherName) {
  if (!value) return "__UNASSIGNED__";
  if (value === "__OTHER__:") {
    const name = (otherName ?? "").trim();
    return name ? `__OTHER__:${name}` : "__OTHER__:";
  }
  return value;
}

function displayAssignedTo(value) {
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
  const navigation = useNavigation();
  const route = useRoute();

  const routeMode = route?.params?.mode;
  const taskId = route?.params?.taskId;
  const isEdit = routeMode === "edit" || !!taskId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // View/Edit mode: existing tasks open locked until user taps "Edit"
  const [isLocked, setIsLocked] = useState(isEdit);

  // Snapshot so Cancel restores original values
  const [snapshot, setSnapshot] = useState(null);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const [assignedTo, setAssignedTo] = useState("__UNASSIGNED__");
  const [otherName, setOtherName] = useState("");

  const [dueISO, setDueISO] = useState(null);

  const [calendarSyncRequested, setCalendarSyncRequested] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(null);

  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [reminderPickerOpen, setReminderPickerOpen] = useState(false);

  const canSave = title.trim().length > 0;
  const hasDue = !!dueISO;
  const isEditable = !isEdit || !isLocked;

  const reminderOptions = useMemo(() => [0, 1, 2, 3, 5, 7, 14], []);

  // Fetch the current screen name from user settings (onboarding)
  const userSettings = getUserSettings(); // Assuming we have a function to fetch the user's settings
  const userName = userSettings?.screenName || "Myself";  // Default to "Myself" if no name is found

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

      if (value === "__MYSELF__") {
        setAssignedTo(userName); // Assign to current user using the screen name
      } else if (value === "__OTHER__:") {
        if (!otherName) setOtherName("");
      } else {
        // If user picks a preset, clear other name (visual)
        if (value !== assignedTo && assignedTo.startsWith("__OTHER__:")) {
          setOtherName("");
        }
      }

      setAssigneeOpen(false);
    },
    [assignedTo, otherName, userName]
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
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        {/* Handle bottom buttons for Cancel/Save */}
      </View>
    </KeyboardAvoidingView>
  );
}
