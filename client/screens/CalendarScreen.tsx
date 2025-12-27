import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * Calendar v1.1 (Phase 1 thin slice)
 * - Adds Month Header (prev/next month + Today)
 * - Adds View Toggle placeholder (Month "Coming soon", Week "current")
 * - Keeps week strip + selected-day focus / empty agenda area
 * - No date picker usage (canonical DatePickerModal remains the only picker when needed later)
 * - No data wiring
 */

const WEEK_STARTS_ON_MONDAY = true;

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonthsClamp(d: Date, deltaMonths: number) {
  // Keep the day-of-month when possible; clamp to last day if needed.
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  const targetMonthIndex = month + deltaMonths;
  const target = new Date(year, targetMonthIndex, 1);
  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth();

  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDay);

  const result = new Date(targetYear, targetMonth, clampedDay);
  result.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  return result;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const mondayBasedIndex = (day + 6) % 7; // 0 Mon .. 6 Sun

  const offset = WEEK_STARTS_ON_MONDAY ? -mondayBasedIndex : -day;
  return addDays(x, offset);
}

function formatMonthYear(d: Date) {
  // Use built-in Intl (no extra deps)
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(d);
}

function formatDayHeader(d: Date, today: Date) {
  if (isSameDay(d, today)) return "Today";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

function formatShortWeekday(d: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
}

export default function CalendarScreen() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const monthLabel = useMemo(() => formatMonthYear(selectedDate), [selectedDate]);

  function goToToday() {
    setSelectedDate(today);
  }

  function goPrevMonth() {
    setSelectedDate((prev) => startOfDay(addMonthsClamp(prev, -1)));
  }

  function goNextMonth() {
    setSelectedDate((prev) => startOfDay(addMonthsClamp(prev, 1)));
  }

  function onPressMonthMode() {
    Alert.alert("Coming soon", "Month view will be added in a later phase.");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Month Header */}
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={goPrevMonth}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Text style={styles.iconBtnText}>‹</Text>
          </Pressable>

          <Text style={styles.monthTitle}>{monthLabel}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={goNextMonth}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Text style={styles.iconBtnText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.modeRow}>
          <View style={styles.modePill}>
            <Pressable
              onPress={onPressMonthMode}
              style={({ pressed }) => [styles.modeItem, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Month view (coming soon)"
            >
              <Text style={styles.modeTextMuted}>Month</Text>
              <Text style={styles.modeSubtle}>soon</Text>
            </Pressable>

            <View style={styles.modeDivider} />

            <View style={[styles.modeItem, styles.modeItemSelected]}>
              <Text style={styles.modeText}>Week</Text>
              <Text style={styles.modeSubtle}>current</Text>
            </View>
          </View>

          <Pressable
            onPress={goToToday}
            style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go to today"
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </Pressable>
        </View>

        {/* Weekly strip (kept) */}
        <View style={styles.weekStrip}>
          {weekDays.map((d) => {
            const isSelected = isSameDay(d, selectedDate);
            const isToday = isSameDay(d, today);

            return (
              <Pressable
                key={`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`}
                onPress={() => setSelectedDate(startOfDay(d))}
                style={({ pressed }) => [
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${d.toDateString()}`}
              >
                <Text style={[styles.dayDow, isSelected && styles.dayTextSelected]}>
                  {formatShortWeekday(d)}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayTextSelected]}>
                  {d.getDate()}
                </Text>
                {isToday ? <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} /> : <View style={styles.todayDotPlaceholder} />}
              </Pressable>
            );
          })}
        </View>

        {/* Selected day focus + agenda empty state */}
        <View style={styles.agendaCard}>
          <Text style={styles.agendaTitle}>{formatDayHeader(selectedDate, today)}</Text>

          <View style={styles.divider} />

          <Text style={styles.emptyTitle}>Nothing scheduled.</Text>
          <Text style={styles.emptyBody}>
            Events and reminders will appear here.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F6",
  },
  iconBtnText: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "600",
  },

  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#F4F4F6",
    overflow: "hidden",
  },
  modeItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  modeItemSelected: {
    backgroundColor: "#FFFFFF",
  },
  modeDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#D9D9DE",
  },
  modeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modeTextMuted: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5F5F66",
  },
  modeSubtle: {
    fontSize: 12,
    color: "#7A7A83",
    fontWeight: "600",
  },

  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F4F4F6",
  },
  todayBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },

  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 14,
  },
  dayCell: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F7F9",
  },
  dayCellSelected: {
    backgroundColor: "#121214",
  },
  dayDow: {
    fontSize: 12,
    color: "#5F5F66",
    fontWeight: "700",
  },
  dayNum: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
    color: "#121214",
  },
  dayTextSelected: {
    color: "#FFFFFF",
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    backgroundColor: "#121214",
  },
  todayDotSelected: {
    backgroundColor: "#FFFFFF",
  },
  todayDotPlaceholder: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    backgroundColor: "transparent",
  },

  agendaCard: {
    borderRadius: 18,
    backgroundColor: "#F7F7F9",
    padding: 16,
  },
  agendaTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E2E8",
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    color: "#5F5F66",
    lineHeight: 20,
  },

  pressed: {
    opacity: 0.75,
  },
});
