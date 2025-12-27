import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { formatDisplayDMY, parseYYYYMMDD } from "../components/DatePickerModal";
import { getBirthdays, subscribeBirthdays, type Birthday } from "../data/birthdaysStore";
import type { HomeStackParamList } from "../navigation/HomeStack";

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

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function turnsAgeOnNextBirthday(dob: Date, next: Date) {
  return next.getFullYear() - dob.getFullYear();
}

type TabKey = "NEXT" | "AZ";

export default function BirthdaysScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [tab, setTab] = React.useState<TabKey>("NEXT");

  const [, force] = React.useState(0);
  React.useEffect(() => subscribeBirthdays(() => force((n) => n + 1)), []);

  const birthdays = getBirthdays();
  const today = startOfDay(new Date());

  const enriched = React.useMemo(() => {
    return birthdays.map((b) => {
      const dob = parseYYYYMMDD(b.dateYYYYMMDD);
      const month0 = dob ? dob.getMonth() : 0;
      const day = dob ? dob.getDate() : 1;
      const next = nextOccurrence(today, month0, day);
      const days = daysBetween(today, next);
      const turns = dob ? turnsAgeOnNextBirthday(dob, next) : null;
      return { ...b, _next: next, _days: days, _turns: turns };
    });
  }, [birthdays, today]);

  const nextUp = React.useMemo(() => {
    return enriched
      .filter((b) => b._days >= 0 && b._days <= 60)
      .sort((a, b) => a._days - b._days);
  }, [enriched]);

  const allAZ = React.useMemo(() => {
    return [...enriched].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [enriched]);

  const items = tab === "NEXT" ? nextUp : allAZ;

  const openAdd = () => navigation.navigate("BirthdaysEdit", undefined);
  const openEdit = (b: Birthday) => navigation.navigate("BirthdaysEdit", { existing: b });

  const formatMeta = (b: any) => {
    if (tab === "NEXT") {
      if (b._days === 0) return `Today • ${formatDisplayDMY(b._next)}`;
      if (b._days === 1) return `Tomorrow • ${formatDisplayDMY(b._next)}`;
      return `In ${b._days} days • ${formatDisplayDMY(b._next)}`;
    }
    return formatDisplayDMY(b._next);
  };

  const renderRow = (b: any) => {
    const turnsLabel = typeof b._turns === "number" ? `Turns ${b._turns}` : null;

    return (
      <TouchableOpacity
        key={b.id}
        onPress={() => openEdit(b)}
        activeOpacity={0.85}
        style={styles.row}
      >
        <View style={styles.iconWrap}>
          <Ionicons
            name={tab === "NEXT" ? "gift-outline" : "person-circle-outline"}
            size={20}
            color={vars.inkMuted}
          />
        </View>

        <View style={styles.textWrap}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>
              {b.name}
            </Text>
            {turnsLabel ? <Text style={styles.turns}>  · {turnsLabel}</Text> : null}
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {b.relationship ? `${b.relationship} • ` : ""}
            {formatMeta(b)}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={vars.inkMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Birthdays</Text>
            <Text style={styles.subtitle}>Phase 1 (demo UI only)</Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add birthday"
            onPress={openAdd}
            activeOpacity={0.85}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsWrap}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Show next up"
            onPress={() => setTab("NEXT")}
            activeOpacity={0.9}
            style={[styles.tabBtn, tab === "NEXT" ? styles.tabBtnActive : undefined]}
          >
            <Text style={[styles.tabText, tab === "NEXT" ? styles.tabTextActive : undefined]}>
              Next up
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Show A to Z"
            onPress={() => setTab("AZ")}
            activeOpacity={0.9}
            style={[styles.tabBtn, tab === "AZ" ? styles.tabBtnActive : undefined]}
          >
            <Text style={[styles.tabText, tab === "AZ" ? styles.tabTextActive : undefined]}>
              A–Z
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {tab === "NEXT" ? "Next up (next 60 days)" : "All birthdays (A–Z)"}
          </Text>

          {tab === "NEXT" && items.length === 0 ? (
            <Text style={styles.placeholder}>No birthdays in the next 60 days.</Text>
          ) : (
            items.map(renderRow)
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coming soon</Text>
          <Text style={styles.placeholder}>Reminders / notifications</Text>
          <Text style={styles.placeholder}>Card / gift tracking</Text>
          <Text style={styles.placeholder}>Shared status (e.g. “card sent”)</Text>
        </View>
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

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },

  title: { fontSize: 26, lineHeight: 32, fontWeight: "700", color: vars.ink, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 18, fontWeight: "600", color: vars.inkMuted },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  addBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

  tabsWrap: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 16,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    backgroundColor: "#111827",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "800",
    color: vars.inkMuted,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },

  card: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, lineHeight: 20, fontWeight: "700", color: vars.ink, marginBottom: 10 },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F2F3F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textWrap: { flex: 1 },

  nameLine: { flexDirection: "row", alignItems: "baseline" },
  name: { fontSize: 16, lineHeight: 20, fontWeight: "900", color: vars.ink },
  turns: { fontSize: 14, lineHeight: 18, fontWeight: "800", color: vars.inkMuted },

  meta: { fontSize: 13, lineHeight: 18, fontWeight: "700", color: vars.inkMuted, marginTop: 2 },

  placeholder: { fontSize: 14, lineHeight: 18, fontWeight: "700", color: vars.inkMuted, marginTop: 8 },
});
