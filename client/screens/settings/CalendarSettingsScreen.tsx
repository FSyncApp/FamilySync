import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Calendar settings v1.6 (Phase 1 thin slice)
 *
 * Goals:
 *  - Make Calendar settings feel real (local-only)
 *  - Only settings that affect current Phase 1 Calendar surfaces:
 *      A) School holidays header label mode (2025/2026 vs 2025)
 *      B) "Who's doing the run?" people list for School runs
 *
 * Storage keys (AsyncStorage):
 *  - fs.calendar.schoolYearLabelMode.v1  => "split" | "single"
 *  - fs.runs.people.v1                   => string[]
 *
 * NOTE: No Supabase wiring in Phase 1.
 */

const KEY_YEAR_LABEL_MODE = "fs.calendar.schoolYearLabelMode.v1";
const KEY_RUNS_PEOPLE = "fs.runs.people.v1";

type YearLabelMode = "split" | "single";

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function uniqCaseInsensitive(list: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const name = normalizeName(raw);
    if (!name) continue;
    const k = name.toLowerCase();
    if (k === "you") continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(name);
  }
  return out.slice(0, 20);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  title,
  subtitle,
  right,
  badge,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: string;
  badge?: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      {!!right && <Text style={styles.rowRight}>{right}</Text>}
      {!!badge && <Text style={styles.badge}>{badge}</Text>}
      {!!onPress && <Text style={styles.chev}>›</Text>}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.rowPress, pressed && styles.rowPressed]}>
      {content}
    </Pressable>
  );
}

function Segmented({
  left,
  right,
  value,
  onChange,
}: {
  left: { label: string; value: YearLabelMode };
  right: { label: string; value: YearLabelMode };
  value: YearLabelMode;
  onChange: (v: YearLabelMode) => void;
}) {
  return (
    <View style={styles.segment}>
      <Pressable
        onPress={() => onChange(left.value)}
        style={({ pressed }) => [
          styles.segmentItem,
          value === left.value && styles.segmentItemSelected,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.segmentText, value === left.value && styles.segmentTextSelected]}>{left.label}</Text>
      </Pressable>

      <Pressable
        onPress={() => onChange(right.value)}
        style={({ pressed }) => [
          styles.segmentItem,
          value === right.value && styles.segmentItemSelected,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.segmentText, value === right.value && styles.segmentTextSelected]}>{right.label}</Text>
      </Pressable>
    </View>
  );
}

export default function CalendarSettingsScreen() {
  const [yearLabelMode, setYearLabelMode] = useState<YearLabelMode>("split");

  const [people, setPeople] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [newName, setNewName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      try {
        const rawMode = await AsyncStorage.getItem(KEY_YEAR_LABEL_MODE);
        if (mounted && (rawMode === "split" || rawMode === "single")) setYearLabelMode(rawMode);

        const rawPeople = await AsyncStorage.getItem(KEY_RUNS_PEOPLE);
        if (mounted && rawPeople) {
          const parsed = JSON.parse(rawPeople);
          if (Array.isArray(parsed)) {
            const cleaned = uniqCaseInsensitive(parsed.map((x) => String(x)));
            setPeople(cleaned);
          }
        }
      } catch {
        // ignore (Phase 1 local-only)
      } finally {
        if (mounted) setLoaded(true);
      }
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEY_YEAR_LABEL_MODE, yearLabelMode).catch(() => {});
  }, [yearLabelMode, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEY_RUNS_PEOPLE, JSON.stringify(people)).catch(() => {
      Alert.alert("Couldn’t save changes", "Try again.");
    });
  }, [people, loaded]);

  const yearLabelPreview = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0..11
    const base = m >= 7 ? y : y - 1;
    return yearLabelMode === "split" ? `${base}/${base + 1}` : `${base}`;
  }, [yearLabelMode]);

  function addPerson() {
    const name = normalizeName(newName);
    if (!name) return;
    const next = uniqCaseInsensitive([...people, name]);
    setPeople(next);
    setNewName("");
  }

  function beginEdit(i: number) {
    setEditingIndex(i);
    setEditingValue(people[i] || "");
  }

  function commitEdit() {
    if (editingIndex === null) return;
    const name = normalizeName(editingValue);
    if (!name) return;
    const nextRaw = people.slice();
    nextRaw[editingIndex] = name;
    const next = uniqCaseInsensitive(nextRaw);
    setPeople(next);
    setEditingIndex(null);
    setEditingValue("");
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingValue("");
  }

  function removePerson(i: number) {
    const name = people[i];
    Alert.alert("Remove person?", `Remove “${name}” from the list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setPeople((prev) => prev.filter((_, idx) => idx !== i)),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Calendar settings</Text>

        <Section title="School holidays">
          <View style={styles.block}>
            <Text style={styles.label}>School year label</Text>
            <Text style={styles.hint}>
              Controls the header in School holidays.
            </Text>

            <Segmented
              left={{ label: "2025/2026", value: "split" }}
              right={{ label: "2025", value: "single" }}
              value={yearLabelMode}
              onChange={setYearLabelMode}
            />

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Preview</Text>
              <Text style={styles.previewValue}>{yearLabelPreview}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Row
            title="Academic year start"
            subtitle="Used to group holidays"
            right="August"
            badge="Soon"
            onPress={() =>
              Alert.alert("Coming soon", "Custom academic year boundaries will be configurable in a later phase.")
            }
          />
        </Section>

        <Section title="School runs">
          <View style={styles.block}>
            <Text style={styles.label}>People list</Text>
            <Text style={styles.hint}>
              Used in “Who’s doing the run?” when adding a pickup/drop-off.
            </Text>

            <View style={styles.addRow}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Add a person"
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={addPerson}
              />
              <Pressable
                onPress={addPerson}
                disabled={!normalizeName(newName)}
                style={({ pressed }) => [
                  styles.addBtn,
                  !normalizeName(newName) && styles.addBtnDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.addBtnText, !normalizeName(newName) && styles.addBtnTextDisabled]}>Add</Text>
              </Pressable>
            </View>

            <Text style={styles.smallNote}>“You” is always available and isn’t shown here.</Text>
          </View>

          <View style={styles.divider} />

          {people.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No people saved yet.</Text>
              <Text style={styles.emptySub}>Add names above to speed up school run entries.</Text>
            </View>
          ) : (
            people.map((p, i) => (
              <View key={`${p}_${i}`} style={styles.personRowWrap}>
                {editingIndex === i ? (
                  <View style={styles.editRow}>
                    <TextInput
                      value={editingValue}
                      onChangeText={setEditingValue}
                      placeholder="Name"
                      placeholderTextColor="#9CA3AF"
                      style={styles.textInput}
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={commitEdit}
                    />
                    <Pressable
                      onPress={commitEdit}
                      disabled={!normalizeName(editingValue)}
                      style={({ pressed }) => [
                        styles.smallBtn,
                        !normalizeName(editingValue) && styles.smallBtnDisabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[styles.smallBtnText, !normalizeName(editingValue) && styles.smallBtnTextDisabled]}
                      >
                        Save
                      </Text>
                    </Pressable>
                    <Pressable onPress={cancelEdit} style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}>
                      <Text style={styles.smallBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.personRow}>
                    <Text style={styles.personName}>{p}</Text>
                    <View style={styles.personActions}>
                      <Pressable
                        onPress={() => beginEdit(i)}
                        style={({ pressed }) => [styles.linkBtn, pressed && styles.rowPressed]}
                      >
                        <Text style={styles.linkBtnText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => removePerson(i)}
                        style={({ pressed }) => [styles.linkBtn, pressed && styles.rowPressed]}
                      >
                        <Text style={[styles.linkBtnText, { color: "#B91C1C" }]}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </Section>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Phase 1 note</Text>
          <Text style={styles.noteText}>
            These settings are saved locally on this device. Family syncing will be added in a later phase.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8FB" },
  container: { padding: 16, paddingBottom: 28 },
  pageTitle: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 12 },

  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    overflow: "hidden",
  },

  block: { padding: 14 },
  label: { fontSize: 15, fontWeight: "800", color: "#111827", marginBottom: 4 },
  hint: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 10 },

  segment: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    overflow: "hidden",
    backgroundColor: "#F7F8FB",
  },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
  segmentItemSelected: { backgroundColor: "#111827" },
  segmentText: { fontSize: 14, fontWeight: "800", color: "#6B7280" },
  segmentTextSelected: { color: "#FFFFFF" },

  previewRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F7F8FB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F5",
  },
  previewLabel: { fontSize: 13, fontWeight: "800", color: "#6B7280" },
  previewValue: { fontSize: 13, fontWeight: "900", color: "#111827" },

  divider: { height: 1, backgroundColor: "#EEF0F5" },

  rowPress: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F5",
  },
  rowPressed: { opacity: 0.6 },
  rowTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  rowSub: { marginTop: 2, fontSize: 13, fontWeight: "600", color: "#6B7280" },
  rowRight: { fontSize: 13, fontWeight: "900", color: "#111827" },
  chev: { fontSize: 20, fontWeight: "800", color: "#9CA3AF", marginLeft: 4 },
  badge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  addRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  textInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  addBtn: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addBtnDisabled: { backgroundColor: "#D1D5DB" },
  addBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  addBtnTextDisabled: { color: "#FFFFFF" },

  smallNote: { marginTop: 10, fontSize: 12, fontWeight: "700", color: "#6B7280" },

  emptyWrap: { padding: 14 },
  emptyText: { fontSize: 14, fontWeight: "800", color: "#111827" },
  emptySub: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "#6B7280" },

  personRowWrap: { borderBottomWidth: 1, borderBottomColor: "#EEF0F5" },
  personRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  personName: { fontSize: 15, fontWeight: "900", color: "#111827" },
  personActions: { flexDirection: "row", gap: 14, alignItems: "center" },
  linkBtn: { paddingVertical: 6, paddingHorizontal: 6, borderRadius: 10 },
  linkBtnText: { fontSize: 13, fontWeight: "900", color: "#111827" },

  editRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  smallBtn: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  smallBtnDisabled: { opacity: 0.5 },
  smallBtnText: { fontSize: 13, fontWeight: "900", color: "#111827" },
  smallBtnTextDisabled: { color: "#6B7280" },

  noteCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    padding: 14,
  },
  noteTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  noteText: { marginTop: 6, fontSize: 13, fontWeight: "600", color: "#6B7280", lineHeight: 18 },

  pressed: { opacity: 0.65 },
});
