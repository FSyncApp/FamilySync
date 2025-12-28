import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { formatDisplayDMY } from "../components/DatePickerModal";
import { getBirthdays, subscribeBirthdays, type Birthday } from "../data/birthdaysStore";
import type { HomeStackParamList } from "../navigation/HomeStack";

type Nav = NativeStackNavigationProp<HomeStackParamList>;
type R = RouteProp<HomeStackParamList, "BirthdayDetail">;

type Meta = {
  cardSent: boolean;
  giftBought: boolean;
  notes: string;
  lastResetYear: number;
};

const META_KEY = "familysync_birthday_detail_meta_v1_5";

function defaultMeta(): Meta {
  return { cardSent: false, giftBought: false, notes: "", lastResetYear: 0 };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function nextOccurrence(today: Date, month0: number, day: number) {
  const y = today.getFullYear();
  const candidate = new Date(y, month0, day);
  candidate.setHours(0, 0, 0, 0);
  if (candidate >= today) return candidate;

  const next = new Date(y + 1, month0, day);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseYYYYMMDD(s: string) {
  // Expected: "YYYY-MM-DD"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function turnsAgeOnNextBirthday(dob: Date, next: Date) {
  return next.getFullYear() - dob.getFullYear();
}

async function readAllMeta(): Promise<Record<string, Meta>> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAllMeta(map: Record<string, Meta>) {
  try {
    await AsyncStorage.setItem(META_KEY, JSON.stringify(map));
  } catch {
    // demo/local only
  }
}

export default function BirthdayDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { id } = route.params;

  const [, force] = useState(0);
  useEffect(() => subscribeBirthdays(() => force((n) => n + 1)), []);

  const birthday: Birthday | undefined = useMemo(() => {
    return getBirthdays().find((b) => b.id === id);
  }, [id]);

  const [meta, setMeta] = useState<Meta>(defaultMeta());
  const [loaded, setLoaded] = useState(false);

  // Load + reset toggles after birthday passes (simple yearly reset).
  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await readAllMeta();
      const current = all[id] ?? defaultMeta();

      if (birthday) {
        const dob = parseYYYYMMDD(birthday.dateYYYYMMDD);
        if (dob) {
          const today = startOfDay(new Date());
          const thisYears = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          thisYears.setHours(0, 0, 0, 0);

          const passed = today.getTime() > thisYears.getTime();
          const thisYear = today.getFullYear();

          if (passed && current.lastResetYear !== thisYear) {
            const reset: Meta = {
              ...current,
              cardSent: false,
              giftBought: false,
              lastResetYear: thisYear,
            };
            all[id] = reset;
            await writeAllMeta(all);
            if (alive) setMeta(reset);
            setLoaded(true);
            return;
          }
        }
      }

      if (alive) setMeta(current);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [id, birthday]);

  const persist = async (patch: Partial<Meta>) => {
    const next = { ...meta, ...patch };
    setMeta(next);
    const all = await readAllMeta();
    all[id] = next;
    await writeAllMeta(all);
  };

  const openEdit = () => {
    if (!birthday) return;
    navigation.navigate("BirthdaysEdit", { existing: birthday });
  };

  if (!birthday) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>Birthday not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dob = parseYYYYMMDD(birthday.dateYYYYMMDD);
  const today = startOfDay(new Date());
  const next = dob ? nextOccurrence(today, dob.getMonth(), dob.getDate()) : null;
  const turns = dob && next ? turnsAgeOnNextBirthday(dob, next) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              activeOpacity={0.85}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={20} color={vars.ink} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit birthday"
              activeOpacity={0.85}
              style={styles.editBtn}
            >
              <Ionicons name="create-outline" size={18} color={vars.ink} />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={openEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit birthday details"
            activeOpacity={0.85}
          >
            <Text style={styles.title}>{birthday.name}</Text>
            {birthday.relationship ? (
              <Text style={styles.subtitle}>{birthday.relationship}</Text>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Birthday</Text>
            <Text style={styles.value}>{next ? formatDisplayDMY(next) : "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Turns</Text>
            <Text style={styles.value}>{typeof turns === "number" ? `${turns}` : "—"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.label}>Card sent</Text>
              <Text style={styles.hint}>Resets after birthday passes</Text>
            </View>
            <Switch
              value={!!meta.cardSent}
              onValueChange={(v) => persist({ cardSent: v })}
              accessibilityLabel="Card sent"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.label}>Gift bought</Text>
              <Text style={styles.hint}>Resets after birthday passes</Text>
            </View>
            <Switch
              value={!!meta.giftBought}
              onValueChange={(v) => persist({ giftBought: v })}
              accessibilityLabel="Gift bought"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={styles.notes}
            placeholder="Add notes or gift ideas…"
            placeholderTextColor="#9CA3AF"
            multiline
            value={meta.notes ?? ""}
            onChangeText={(t) => persist({ notes: t })}
            textAlignVertical="top"
          />
        </View>

        {!loaded ? <Text style={styles.mutedCenter}>Loading…</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const vars = {
  bg: "#F5F6F8",
  card: "#FFFFFF",
  border: "#E6E8EE",
  ink: "#111827",
  inkMuted: "#6B7280",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: vars.bg },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { color: vars.inkMuted, fontSize: 14 },
  mutedCenter: { textAlign: "center", color: vars.inkMuted, marginTop: 8 },

  header: { marginBottom: 12 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 },
  backText: { fontSize: 14, fontWeight: "700", color: vars.ink },

  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  editText: { fontSize: 14, fontWeight: "800", color: vars.ink },

  title: { fontSize: 26, lineHeight: 32, fontWeight: "800", color: vars.ink, marginTop: 6 },
  subtitle: { fontSize: 14, lineHeight: 18, fontWeight: "600", color: vars.inkMuted, marginTop: 4 },

  card: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  label: { fontSize: 14, fontWeight: "800", color: vars.ink },
  value: { fontSize: 14, fontWeight: "700", color: vars.inkMuted },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  toggleText: { flex: 1, paddingRight: 12 },
  hint: { marginTop: 2, fontSize: 12, fontWeight: "600", color: vars.inkMuted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: vars.border },
  notes: {
    marginTop: 10,
    minHeight: 120,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: vars.border,
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: vars.ink,
  },
});
