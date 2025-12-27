import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";

type Birthday = {
  id: string;
  name: string;
  relationship?: string;
  month: number; // 1-12
  day: number;   // 1-31
  year?: number; // optional (DOB known)
};

function formatMonthDay(b: Birthday) {
  const date = new Date(2000, b.month - 1, b.day);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function computeTurnsX(b: Birthday, now = new Date()) {
  if (!b.year) return null;
  const thisYear = now.getFullYear();
  const next = new Date(thisYear, b.month - 1, b.day);
  const hadBirthday = next.getTime() < new Date(thisYear, now.getMonth(), now.getDate()).getTime();
  const turns = (hadBirthday ? thisYear + 1 : thisYear) - b.year;
  return turns >= 0 ? turns : null;
}

export default function BirthdaysScreen() {
  // Demo/local-only data (Phase 1).
  const [demo] = useState<Birthday[]>([
    { id: "b1", name: "Mum", relationship: "Mum", month: 1, day: 12, year: 1970 },
    { id: "b2", name: "Dad", relationship: "Dad", month: 3, day: 2, year: 1968 },
    { id: "b3", name: "Ellie", relationship: "Daughter", month: 8, day: 25, year: 2016 },
    { id: "b4", name: "Sam", relationship: "Friend", month: 11, day: 7 },
  ]);

  const today = useMemo(() => new Date(), []);
  const upcomingWindowDays = 60; // SPEC default for now; adjust in Birthdays v1 spec if needed.

  const { nextBirthday, upcoming } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + upcomingWindowDays);

    const withNextDate = demo.map((b) => {
      const thisYear = start.getFullYear();
      let d = new Date(thisYear, b.month - 1, b.day);
      if (d < start) d = new Date(thisYear + 1, b.month - 1, b.day);
      return { b, nextDate: d };
    });

    withNextDate.sort((a, c) => a.nextDate.getTime() - c.nextDate.getTime());

    const upcoming = withNextDate
      .filter((x) => x.nextDate >= start && x.nextDate <= end)
      .map((x) => x.b);

    return {
      nextBirthday: withNextDate[0]?.b ?? null,
      upcoming,
    };
  }, [demo]);

  const allSortedAZ = useMemo(() => {
    return [...demo].sort((a, b) => a.name.localeCompare(b.name));
  }, [demo]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Birthdays</Text>

      {/* Next upcoming highlight (supports Home mental model) */}
      {nextBirthday ? (
        <View style={styles.nextCard}>
          <Text style={styles.sectionLabel}>Next</Text>
          <Text style={styles.nextName}>{nextBirthday.name}</Text>
          <Text style={styles.nextMeta}>
            {formatMonthDay(nextBirthday)}
            {computeTurnsX(nextBirthday, today) != null ? ` · Turns ${computeTurnsX(nextBirthday, today)}` : ""}
            {nextBirthday.relationship ? ` · ${nextBirthday.relationship}` : ""}
          </Text>
        </View>
      ) : null}

      {/* Upcoming list */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <Text style={styles.sectionHint}>Next {upcomingWindowDays} days</Text>
        </View>

        {upcoming.length === 0 ? (
          <Text style={styles.empty}>No upcoming birthdays in this window.</Text>
        ) : (
          upcoming.map((b) => (
            <Pressable key={b.id} style={styles.row} accessibilityRole="button">
              <View style={styles.rowLeft}>
                <Text style={styles.rowName}>{b.name}</Text>
                <Text style={styles.rowSub}>
                  {b.relationship ? b.relationship : "—"}
                  {computeTurnsX(b, today) != null ? ` · Turns ${computeTurnsX(b, today)}` : ""}
                </Text>
              </View>
              <Text style={styles.rowRight}>{formatMonthDay(b)}</Text>
            </Pressable>
          ))
        )}
      </View>

      {/* All birthdays */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All birthdays</Text>
          <Text style={styles.sectionHint}>A–Z</Text>
        </View>

        {allSortedAZ.map((b) => (
          <Pressable key={b.id} style={styles.row} accessibilityRole="button">
            <View style={styles.rowLeft}>
              <Text style={styles.rowName}>{b.name}</Text>
              <Text style={styles.rowSub}>
                {b.relationship ? b.relationship : "—"}
                {computeTurnsX(b, today) != null ? ` · Turns ${computeTurnsX(b, today)}` : ""}
              </Text>
            </View>
            <Text style={styles.rowRight}>{formatMonthDay(b)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Coming soon placeholders (non-functional) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coming soon</Text>
        <View style={styles.pillRow}>
          <Text style={styles.pill}>Reminders</Text>
          <Text style={styles.pill}>Card / gift tracking</Text>
          <Text style={styles.pill}>Shared status</Text>
        </View>
        <Text style={styles.comingSoonNote}>
          Placeholders only in Phase 1 — no notifications, no tracking, no sync.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B1220" },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: "white", fontSize: 28, fontWeight: "700", marginBottom: 12 },
  nextCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  sectionLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  nextName: { color: "white", fontSize: 20, fontWeight: "700" },
  nextMeta: { color: "rgba(255,255,255,0.75)", marginTop: 6, fontSize: 13 },

  section: { marginTop: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  sectionHint: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },

  empty: { color: "rgba(255,255,255,0.7)", paddingVertical: 8 },

  row: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rowLeft: { flex: 1, paddingRight: 10 },
  rowName: { color: "white", fontSize: 16, fontWeight: "700" },
  rowSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 3 },
  rowRight: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "700" },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: {
    color: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  comingSoonNote: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 10, lineHeight: 16 },
});
