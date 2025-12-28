import React from "react";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const stylesVars = {
  bg: "#F5F6F8",
  ink: "#111827",
  inkMuted: "#6B7280",
};

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Phase 1 shell — wiring comes later.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: stylesVars.inkMuted,
    textAlign: "center",
  },
});



function SchoolRunsPeopleManager() {
  const STORAGE_KEY_RUNS_PEOPLE = "fs.runs.people.v1";
  const [people, setPeople] = React.useState<string[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY_RUNS_PEOPLE)
      .then((raw) => {
        if (!mounted) return;
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed
            .filter((x) => typeof x === "string")
            .map((x) => String(x).trim())
            .filter((x) => !!x && x.toLowerCase() !== "you")
            .slice(0, 20);
          setPeople(cleaned);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY_RUNS_PEOPLE, JSON.stringify(people)).catch(() => {});
  }, [people, loaded]);

  function add() {
    const n = newName.trim();
    if (!n) return;
    setPeople((prev) => {
      const exists = prev.some((p) => p.toLowerCase() === n.toLowerCase());
      if (exists) return prev;
      return [...prev, n].slice(0, 20);
    });
    setNewName("");
  }

  function remove(name: string) {
    setPeople((prev) => prev.filter((p) => p !== name));
  }

  return (
    <View>
      {people.length === 0 ? (
        <Text style={{ color: "#6B7280", marginBottom: 10 }}>No extra people added yet.</Text>
      ) : (
        people.map((p) => (
          <View key={p} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#EEF0F4" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>{p}</Text>
            <Pressable onPress={() => remove(p)} style={({ pressed }) => [{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#F3F4F6" }, pressed && { opacity: 0.7 }]}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#111827" }}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1, borderWidth: 1, borderColor: "#E6E8EE", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 }}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Add person…"
            placeholderTextColor="#9CA3AF"
            style={{ fontSize: 15, color: "#111827" }}
          />
        </View>
        <Pressable onPress={add} style={({ pressed }) => [{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#111827" }, pressed && { opacity: 0.85 }]}>
          <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}
