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
 * Calendar v1.2 (Phase 1 thin slice)
 * - Keeps Month header (prev/next month + Today) and week strip
 * - Replaces single empty agenda card with TimeTree-style "Day Sheet" agenda structure:
 *    - Header: Selected day + item count pill
 *    - Sections: All-day, Scheduled, Tasks (always visible, even when empty)
 * - No data wiring (placeholder arrays are empty)
 * - No date picker usage (canonical DatePickerModal remains the only picker when needed later)
 */

const WEEK_STARTS_ON_MONDAY = true;

type AgendaItem = {
  id: string;
  title: string;
  subtitle?: string;
};

type TimedItem = {
  id: string;
  timeLabel: string; // e.g. "09:00"
  title: string;
  subtitle?: string;
};

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
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(d);
}

function formatShortWeekday(d: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
}

function formatDayTitle(d: Date) {
  // e.g. "Saturday 10 January"
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export default function CalendarScreen() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  // Placeholder arrays (Phase 1: empty)
  const allDayItems: AgendaItem[] = [];
  const scheduledItems: TimedItem[] = [];
  const taskItems: AgendaItem[] = [];

  const itemCount = allDayItems.length + scheduledItems.length + taskItems.length;

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

  function onPressAgendaItem() {
    Alert.alert("Coming soon", "Event details will be available in a later phase.");
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

        {/* Mode + Today */}
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

        {/* Weekly strip */}
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
                {isToday ? (
                  <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />
                ) : (
                  <View style={styles.todayDotPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Day Sheet (TimeTree-style) */}
        <View style={styles.daySheet}>
          <View style={styles.daySheetHeader}>
            <Text style={styles.dayTitle}>{formatDayTitle(selectedDate)}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{itemCount} items</Text>
            </View>
          </View>

          {/* All-day */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All-day</Text>
            {allDayItems.length === 0 ? (
              <Text style={styles.emptyText}>No all-day items</Text>
            ) : (
              allDayItems.map((it) => (
                <Pressable
                  key={it.id}
                  onPress={onPressAgendaItem}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${it.title}`}
                >
                  <View style={styles.sourceBar} />
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{it.title}</Text>
                    {!!it.subtitle && <Text style={styles.rowSub}>{it.subtitle}</Text>}
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <View style={styles.sectionDivider} />

          {/* Scheduled */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scheduled</Text>
            {scheduledItems.length === 0 ? (
              <Text style={styles.emptyText}>Nothing scheduled</Text>
            ) : (
              scheduledItems.map((it) => (
                <Pressable
                  key={it.id}
                  onPress={onPressAgendaItem}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${it.title}`}
                >
                  <Text style={styles.timeLabel}>{it.timeLabel}</Text>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{it.title}</Text>
                    {!!it.subtitle && <Text style={styles.rowSub}>{it.subtitle}</Text>}
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <View style={styles.sectionDivider} />

          {/* Tasks */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            {taskItems.length === 0 ? (
              <Text style={styles.emptyText}>No tasks due</Text>
            ) : (
              taskItems.map((it) => (
                <Pressable
                  key={it.id}
                  onPress={onPressAgendaItem}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${it.title}`}
                >
                  <View style={styles.taskDot} />
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{it.title}</Text>
                    {!!it.subtitle && <Text style={styles.rowSub}>{it.subtitle}</Text>}
                  </View>
                </Pressable>
              ))
            )}
          </View>
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

  daySheet: {
    borderRadius: 18,
    backgroundColor: "#F7F7F9",
    padding: 16,
  },
  daySheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
  },
  countPill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countPillText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5F5F66",
  },

  section: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5F5F66",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#7A7A83",
    lineHeight: 20,
    paddingBottom: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E2E2E8",
    marginVertical: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  sourceBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: "#D9D9DE", // neutral placeholder; reserved colors later
  },
  timeLabel: {
    width: 54,
    fontSize: 13,
    fontWeight: "800",
    color: "#5F5F66",
  },
  taskDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#D9D9DE",
  },
  rowMain: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#121214",
  },
  rowSub: {
    marginTop: 2,
    fontSize: 13,
    color: "#7A7A83",
  },

  pressed: {
    opacity: 0.75,
  },
});
