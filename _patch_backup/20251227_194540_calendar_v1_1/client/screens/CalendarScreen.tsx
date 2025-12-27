import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Calendar v1 (Phase 1)
 * - Calm weekly scaffold
 * - No alternate date pickers (canon)
 * - No data wiring (Supabase later)
 */

const stylesVars = {
  bg: "#F5F6F8",
  card: "#FFFFFF",
  border: "#E6E8EE",
  ink: "#111827",
  inkMuted: "#6B7280",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeekMonday(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  // JS: Sun=0 ... Sat=6. Convert to Monday-based index.
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // move back to Monday
  date.setDate(date.getDate() + diff);
  return date;
}

function addDays(d: Date, days: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMonthRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };

  const s = weekStart.toLocaleDateString(undefined, opts);
  const e = weekEnd.toLocaleDateString(undefined, opts);

  // If same month/year, show one label; else show a compact range.
  if (
    weekStart.getFullYear() === weekEnd.getFullYear() &&
    weekStart.getMonth() === weekEnd.getMonth()
  ) {
    return s;
  }
  return `${s} – ${e}`;
}

function formatLong(d: Date) {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  };
  return d.toLocaleDateString(undefined, opts);
}

export default function CalendarScreen() {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });

  const weekDays = useMemo(() => {
    return DAY_LABELS.map((_, idx) => addDays(weekStart, idx));
  }, [weekStart]);

  const monthLabel = useMemo(() => formatMonthRange(weekStart), [weekStart]);

  const goPrevWeek = () => {
    const prev = addDays(weekStart, -7);
    setWeekStart(prev);
    // Keep selection in same weekday position relative to week start
    const idx = Math.max(0, Math.min(6, Math.round((selectedDay.getTime() - weekStart.getTime()) / 86400000)));
    setSelectedDay(addDays(prev, idx));
  };

  const goNextWeek = () => {
    const next = addDays(weekStart, 7);
    setWeekStart(next);
    const idx = Math.max(0, Math.min(6, Math.round((selectedDay.getTime() - weekStart.getTime()) / 86400000)));
    setSelectedDay(addDays(next, idx));
  };

  const goToday = () => {
    const ws = startOfWeekMonday(today);
    setWeekStart(ws);
    setSelectedDay(today);
  };

  const isThisWeek = useMemo(() => {
    return weekDays.some((d) => sameDay(d, today));
  }, [weekDays, today]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Calendar</Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
            onPress={goToday}
            activeOpacity={0.85}
            style={[styles.todayChip, isThisWeek && styles.todayChipSubtle]}
          >
            <Ionicons name="time-outline" size={16} color={stylesVars.inkMuted} />
            <Text style={styles.todayChipText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Week scaffold */}
        <View style={styles.weekCard}>
          <View style={styles.weekTopRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              onPress={goPrevWeek}
              activeOpacity={0.8}
              style={styles.chevBtn}
            >
              <Ionicons name="chevron-back" size={20} color={stylesVars.inkMuted} />
            </TouchableOpacity>

            <Text style={styles.monthLabel} numberOfLines={1}>
              {monthLabel}
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Next week"
              onPress={goNextWeek}
              activeOpacity={0.8}
              style={styles.chevBtn}
            >
              <Ionicons name="chevron-forward" size={20} color={stylesVars.inkMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.daysRow}>
            {weekDays.map((d, idx) => {
              const selected = sameDay(d, selectedDay);
              const isToday = sameDay(d, today);
              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  accessibilityRole="button"
                  accessibilityLabel={`${DAY_LABELS[idx]} ${d.getDate()}`}
                  onPress={() => setSelectedDay(d)}
                  activeOpacity={0.85}
                  style={[
                    styles.dayPill,
                    selected && styles.dayPillSelected,
                    isToday && !selected && styles.dayPillToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      selected && styles.dayLabelSelected,
                      isToday && !selected && styles.dayLabelToday,
                    ]}
                  >
                    {DAY_LABELS[idx]}
                  </Text>
                  <Text
                    style={[
                      styles.dayNum,
                      selected && styles.dayNumSelected,
                      isToday && !selected && styles.dayNumToday,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected day agenda (empty state) */}
        <View style={styles.agendaCard}>
          <View style={styles.agendaHeaderRow}>
            <Text style={styles.agendaTitle} numberOfLines={1}>
              {formatLong(selectedDay)}
            </Text>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>0 items</Text>
            </View>
          </View>

          <View style={styles.emptyBlock}>
            <Ionicons name="calendar-outline" size={22} color={stylesVars.inkMuted} />
            <Text style={styles.emptyTitle}>Nothing scheduled</Text>
            <Text style={styles.emptySubtitle}>
              This is a Phase 1 scaffold. Events and tasks will appear here later.
            </Text>
          </View>
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  page: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: stylesVars.ink,
  },
  todayChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  todayChipSubtle: {
    // Still clickable, but visually calm when already on this week.
    opacity: 0.9,
  },
  todayChipText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    color: stylesVars.inkMuted,
  },

  weekCard: {
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  weekTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  chevBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 10,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
    color: stylesVars.ink,
  },

  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayPill: {
    width: "13.3%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  dayPillSelected: {
    backgroundColor: stylesVars.ink,
    borderColor: stylesVars.ink,
  },
  dayPillToday: {
    borderColor: "#CBD5E1",
    backgroundColor: "#FAFBFC",
  },
  dayLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    color: stylesVars.inkMuted,
    marginBottom: 2,
  },
  dayLabelSelected: {
    color: "#FFFFFF",
  },
  dayLabelToday: {
    color: stylesVars.inkMuted,
  },
  dayNum: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800",
    color: stylesVars.ink,
  },
  dayNumSelected: {
    color: "#FFFFFF",
  },
  dayNumToday: {
    color: stylesVars.ink,
  },

  agendaCard: {
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    padding: 14,
  },
  agendaHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  agendaTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    color: stylesVars.ink,
    paddingRight: 10,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#FAFBFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "800",
    color: stylesVars.inkMuted,
  },

  emptyBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#FAFBFC",
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: stylesVars.ink,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    color: stylesVars.inkMuted,
    textAlign: "center",
    maxWidth: 320,
  },
});
