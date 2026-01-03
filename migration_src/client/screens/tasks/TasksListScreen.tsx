/** FS PATCH: Tasks list v1 — calm list + add/edit + simple completion toggle (data-backed) */
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { TasksStackParamList } from "../../navigation/TasksStack";
import { listTasks, upsertTask, type TaskRow } from "../../data/tasksStore";

type Nav = NativeStackNavigationProp<TasksStackParamList>;

const vars = {
  bg: "#F5F6F8",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(230,232,238,0.75)",
  ink: "#111827",
  inkMuted: "#6B7280",
  danger: "#B91C1C",
};

function parseISODateMaybe(value: any): Date | null {
  if (!value) return null;
  // Supabase date can come back as "YYYY-MM-DD"
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
}

function daysBetweenUtc(a: Date, b: Date) {
  const a0 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const b0 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((b0 - a0) / (1000 * 60 * 60 * 24));
}

function dueLabel(due: Date) {
  const today = new Date();
  const delta = daysBetweenUtc(today, due);
  if (delta === 0) return "Due today";
  if (delta === 1) return "Due tomorrow";
  if (delta === -1) return "Due yesterday";
  if (delta > 1) return `Due in ${delta} days`;
  return `Overdue by ${Math.abs(delta)} days`;
}

function sortTasks(items: TaskRow[]) {
  const base = [...items];
  base.sort((a: any, b: any) => {
    const ca = Boolean(a?.completed);
    const cb = Boolean(b?.completed);
    if (ca !== cb) return ca ? 1 : -1;

    const da = parseISODateMaybe(a?.due_date);
    const db = parseISODateMaybe(b?.due_date);

    const ta = da ? da.getTime() : Number.POSITIVE_INFINITY;
    const tb = db ? db.getTime() : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;

    return String(a?.title ?? "").localeCompare(String(b?.title ?? ""), undefined, { sensitivity: "base" });
  });
  return base;
}

export default function TasksListScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<TaskRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await listTasks();
      setItems(Array.isArray(next) ? next : []);
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load tasks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Tasks",
      headerRight: () => (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          onPress={() => navigation.navigate("TaskForm", { mode: "create" })}
          style={styles.headerAdd}
        >
          <Ionicons name="add" size={22} color={vars.ink} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const sorted = useMemo(() => sortTasks(items), [items]);

  const toggleComplete = useCallback(
    async (item: TaskRow) => {
      try {
        await upsertTask({
          id: item.id,
          title: item.title,
          notes: item.notes ?? null,
          due_date: item.due_date ?? null,
          assigned_to: item.assigned_to ?? null,
          completed: !Boolean(item.completed),
          calendar_sync_requested: Boolean(item.calendar_sync_requested),
        });
        load();
      } catch (e: any) {
        Alert.alert("Couldn’t update", e?.message ?? "Please try again.");
      }
    },
    [load]
  );

  const renderRow = ({ item }: { item: TaskRow }) => {
    const due = parseISODateMaybe(item.due_date);
    const isDone = Boolean(item.completed);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate("TaskForm", { mode: "edit", taskId: item.id })}
        style={[styles.rowCard, isDone && styles.rowCardDone]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <View style={styles.rowTop}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isDone ? "Mark as not done" : "Mark as done"}
            onPress={() => toggleComplete(item)}
            activeOpacity={0.9}
            style={[styles.checkBtn, isDone && styles.checkBtnDone]}
          >
            <Ionicons
              name={isDone ? "checkmark" : "ellipse-outline"}
              size={18}
              color={isDone ? "#FFFFFF" : vars.inkMuted}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, isDone && styles.rowTitleDone]} numberOfLines={1}>
              {item.title}
            </Text>

            <View style={styles.metaLine}>
              {due ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{formatDateShort(due)}</Text>
                </View>
              ) : (
                <Text style={styles.metaMuted}>No due date</Text>
              )}

              {item.assigned_to ? (
                <Text style={styles.metaText} numberOfLines={1}>
                  • {item.assigned_to}
                </Text>
              ) : null}
            </View>

            {due ? (
              <Text style={[styles.metaHint, isDone && styles.metaHintDone]} numberOfLines={1}>
                {dueLabel(due)}
              </Text>
            ) : null}
          </View>

          <Text style={styles.chev}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {loadError ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Couldn’t load</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn} activeOpacity={0.85}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loadError && sorted.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptyText}>Add a job to do, give it a due date, and assign it if you want.</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("TaskForm", { mode: "create" })}
            style={styles.emptyAdd}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={vars.ink} />
            <Text style={styles.emptyAddText}>Add task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(it) => it.id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vars.bg },

  headerAdd: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
    gap: 10,
  },

  rowCard: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowCardDone: { opacity: 0.72 },

  rowTop: { flexDirection: "row", alignItems: "center", gap: 10 },

  checkBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBtnDone: {
    backgroundColor: vars.ink,
    borderColor: "rgba(17,24,39,0.2)",
  },

  rowTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: vars.ink,
    marginBottom: 4,
  },
  rowTitleDone: { textDecorationLine: "line-through" },

  metaLine: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  metaText: { fontSize: 12, lineHeight: 15, fontWeight: "700", color: vars.inkMuted },
  metaMuted: { fontSize: 12, lineHeight: 15, fontWeight: "700", color: vars.inkMuted },

  metaHint: { fontSize: 12, lineHeight: 15, fontWeight: "700", color: vars.inkMuted },
  metaHintDone: { color: "rgba(107,114,128,0.85)" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(238,240,245,0.9)",
    borderWidth: 1,
    borderColor: "rgba(230,232,238,0.9)",
  },
  badgeText: { fontSize: 12, lineHeight: 15, fontWeight: "800", color: vars.ink },

  chev: { fontSize: 18, fontWeight: "900", color: vars.inkMuted, paddingLeft: 6 },

  center: { alignItems: "center", justifyContent: "center" },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  emptyTitle: { fontSize: 18, lineHeight: 22, fontWeight: "800", color: vars.ink, marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 17, fontWeight: "600", color: vars.inkMuted, textAlign: "center" },
  emptyAdd: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
  },
  emptyAddText: { fontSize: 13, lineHeight: 16, fontWeight: "800", color: vars.ink },

  errorWrap: { paddingHorizontal: 18, paddingTop: 18 },
  errorTitle: { fontSize: 16, lineHeight: 20, fontWeight: "800", color: vars.danger, marginBottom: 4 },
  errorText: { fontSize: 13, lineHeight: 17, fontWeight: "600", color: vars.inkMuted },
  retryBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
  },
  retryText: { fontSize: 13, lineHeight: 16, fontWeight: "800", color: vars.ink },
});
