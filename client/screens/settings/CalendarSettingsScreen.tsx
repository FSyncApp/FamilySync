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

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export default function CalendarSettingsScreen() {
  const [loaded, setLoaded] = useState(false);
  const [people, setPeople] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const sorted = useMemo(() => {
    const uniq = Array.from(new Set(people.map((p) => normalizeName(p)).filter(Boolean)));
    uniq.sort((a, b) => a.localeCompare(b));
    return uniq;
  }, [people]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_RUNS_PEOPLE);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = (parsed as any[])
              .filter((x) => typeof x === "string")
              .map((x) => normalizeName(String(x)))
              .filter((x) => !!x && x.toLowerCase() !== "you")
              .slice(0, 50);
            setPeople(cleaned);
          }
        }
      } catch {
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY_RUNS_PEOPLE, JSON.stringify(sorted)).catch(() => {
      Alert.alert("Couldn’t save changes", "Try again.");
    });
  }, [sorted, loaded]);

  function addPerson() {
    const name = normalizeName(draft);
    if (!name) return;
    if (name.toLowerCase() === "you") return;
    setPeople((prev) => [name, ...prev]);
    setDraft("");
  }

  function confirmDelete(name: string) {
    Alert.alert("Remove person?", `"${name}" will be removed from the picker.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setPeople((prev) => prev.filter((p) => normalizeName(p) !== name)),
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Calendar settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>School runs people</Text>
        <Text style={styles.cardSub}>
          These appear in the “Who’s doing the run?” picker. “You” is always available.
        </Text>

        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add person (e.g. Mark)"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={addPerson}
          />
          <Pressable
            onPress={addPerson}
            disabled={!draft.trim()}
            style={({ pressed }) => [
              styles.addBtn,
              !draft.trim() && styles.addBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.addBtnText, !draft.trim() && styles.addBtnTextDisabled]}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        {sorted.length === 0 ? (
          <Text style={styles.empty}>No saved people yet.</Text>
        ) : (
          sorted.map((p) => (
            <View key={p} style={styles.personRow}>
              <Text style={styles.personName}>{p}</Text>
              <Pressable
                onPress={() => confirmDelete(p)}
                style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Academic year display</Text>
        <Text style={styles.noteText}>
          Phase 1: this stays as “YYYY/YYYY” in School holidays. We can add a toggle later.
        </Text>
      </View>
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
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  cardSub: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  addRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  addBtn: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  addBtnTextDisabled: {
    color: "#9CA3AF",
  },
  divider: {
    marginTop: 12,
    height: 1,
    backgroundColor: "#EEF0F5",
  },
  empty: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  personRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
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
  },
  removeBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#B91C1C",
  },
  noteCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    padding: 14,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  noteText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  pressed: {
    opacity: 0.7,
  },
});
