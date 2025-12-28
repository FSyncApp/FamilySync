import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_RUNS_PEOPLE = "fs.runs.people.v1";
const STORAGE_KEY_SCHOOL_YEAR_LABEL_MODE = "fs.schoolYearLabelMode.v1";

type YearLabelMode = "split" | "single"; // split: 2025/2026, single: 2025

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function CalendarSettingsScreen() {
  const [people, setPeople] = useState<string[]>([]);
  const [peopleLoaded, setPeopleLoaded] = useState(false);

  const [newName, setNewName] = useState("");
  const [mode, setMode] = useState<YearLabelMode>("split");
  const [modeLoaded, setModeLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const rawPeople = await AsyncStorage.getItem(STORAGE_KEY_RUNS_PEOPLE);
        if (mounted && rawPeople) {
          const parsed = JSON.parse(rawPeople);
          if (Array.isArray(parsed)) {
            const cleaned = (parsed as any[])
              .filter((x) => typeof x === "string")
              .map((s) => String(s).trim())
              .filter((s) => !!s && s.toLowerCase() !== "you")
              .slice(0, 30);
            setPeople(cleaned);
          }
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setPeopleLoaded(true);
      }

      try {
        const rawMode = await AsyncStorage.getItem(STORAGE_KEY_SCHOOL_YEAR_LABEL_MODE);
        if (mounted && rawMode) {
          const v = String(rawMode).trim() as YearLabelMode;
          if (v === "split" || v === "single") setMode(v);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setModeLoaded(true);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!peopleLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_RUNS_PEOPLE, JSON.stringify(people)).catch(() => {
      Alert.alert("Couldn’t save", "Try again.");
    });
  }, [people, peopleLoaded]);

  useEffect(() => {
    if (!modeLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_SCHOOL_YEAR_LABEL_MODE, mode).catch(() => {
      Alert.alert("Couldn’t save", "Try again.");
    });
  }, [mode, modeLoaded]);

  const sortedPeople = useMemo(
    () => people.slice().sort((a, b) => a.localeCompare(b)),
    [people]
  );

  function addPerson() {
    const name = newName.trim();
    if (!name) return;
    if (name.toLowerCase() === "you") {
      Alert.alert("Not needed", "“You” is already available by default.");
      return;
    }
    setPeople((prev) => {
      if (prev.some((p) => p.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, name].slice(0, 30);
    });
    setNewName("");
  }

  function removePerson(name: string) {
    setPeople((prev) => prev.filter((p) => p !== name));
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Calendar settings</Text>

      <Section title="School runs">
        <View style={styles.block}>
          <Text style={styles.label}>People available in “Who’s doing the run?”</Text>

          {sortedPeople.length === 0 ? (
            <Text style={styles.muted}>No saved people yet.</Text>
          ) : (
            sortedPeople.map((p) => (
              <View key={p} style={styles.personRow}>
                <Text style={styles.personName}>{p}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => removePerson(p)}
                  style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.removeBtnText}>Remove</Text>
                </Pressable>
              </View>
            ))
          )}

          <View style={styles.addRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Add a person…"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
              returnKeyType="done"
              onSubmitEditing={addPerson}
            />
            <Pressable
              accessibilityRole="button"
              onPress={addPerson}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.primaryBtnText}>Add</Text>
            </Pressable>
          </View>

          <Text style={styles.note}>
            Tip: “You” is always available and doesn’t need to be added here.
          </Text>
        </View>
      </Section>

      <Section title="School holidays">
        <View style={styles.block}>
          <Text style={styles.label}>Academic year label between arrows</Text>

          <View style={styles.segment}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("split")}
              style={({ pressed }) => [
                styles.segmentItem,
                mode === "split" && styles.segmentItemSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.segmentText, mode === "split" && styles.segmentTextSelected]}>
                2025/2026
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setMode("single")}
              style={({ pressed }) => [
                styles.segmentItem,
                mode === "single" && styles.segmentItemSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.segmentText, mode === "single" && styles.segmentTextSelected]}>
                2025
              </Text>
            </Pressable>
          </View>

          <Text style={styles.note}>
            Phase 1: this setting is stored locally. We’ll wire it into the School holidays header
            when we do the next Calendar polish pass.
          </Text>
        </View>
      </Section>

      <Text style={styles.footer}>Phase 1 scaffold — more calendar settings will appear later.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: "#F7F8FB",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  section: {
    marginTop: 14,
  },
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
  block: {
    padding: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  muted: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F5",
  },
  personName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  removeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  addRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  primaryBtn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 999,
  },
  segmentItemSelected: {
    backgroundColor: "#111827",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
  },
  segmentTextSelected: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.6,
  },
  footer: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
});
