import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import DatePickerModal, {
  formatDisplayDMY,
  formatDisplayFromYYYYMMDD,
  formatYYYYMMDD,
  parseYYYYMMDD,
} from "../components/DatePickerModal";

/**
 * Calendar v1.5 (Phase 1 thin slice)
 * - Internal mini-tabs within Calendar tab (LOCKED): Calendar | Taxi | School
 * - Taxi v1 (Local MVP, persisted):
 *   - Add / view (week) / edit / delete pickup & drop-off entries
 *   - Date selection uses canonical DatePickerModal
 *   - Time is free-text (no new time picker in Phase 1)
 * - School Holidays v1 (Local MVP, persisted):
 *   - Add / view (academic year) / edit / delete holiday ranges
 *   - Start/end date selection uses canonical DatePickerModal
 * - Calendar view remains primary and unchanged from prior scaffold.
 *
 * Storage (AsyncStorage):
 *  - fs.taxi.v1
 *  - fs.schoolHolidays.v1
 *
 * NOTE:
 *  - No Supabase wiring
 *  - No alternative date pickers allowed
 */

const WEEK_STARTS_ON_MONDAY = true;

const STORAGE_KEY_TAXI = "fs.taxi.v1";
const STORAGE_KEY_SCHOOL = "fs.schoolHolidays.v1";

type CalendarMode = "calendar" | "taxi" | "school";

/** Calendar demo items (existing scaffold) */
type ItemKind = "allDay" | "scheduled" | "task";
type BaseItem = {
  id: string;
  kind: ItemKind;
  title: string;
  subtitle?: string;
  sourceLabel?: string;
  colorLabel?: string;
  notes?: string;
};
type AllDayItem = BaseItem & { kind: "allDay" };
type ScheduledItem = BaseItem & { kind: "scheduled"; timeLabel: string; endTimeLabel?: string };
type TaskItem = BaseItem & { kind: "task" };
type AnyItem = AllDayItem | ScheduledItem | TaskItem;

/** Taxi */
type TaxiEntry = {
  id: string;
  type: "pickup" | "dropoff";
  dateISO: string; // YYYY-MM-DD
  timeLabel?: string; // free text
  who: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

/** School Holidays */
type SchoolHoliday = {
  id: string;
  name: string;
  startISO: string; // YYYY-MM-DD
  endISO: string; // YYYY-MM-DD
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
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

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMonthsClamp(d: Date, deltaMonths: number) {
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
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

function formatDayShort(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatWeekRangeLabel(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(weekStart);
  const endLabel = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(weekEnd);
  return `${startLabel} – ${endLabel}`;
}

function safeLabel(value?: string, fallback = "None") {
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function compareISO(a: string, b: string) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

function academicYearStartEnd(baseYear: number) {
  const start = formatYYYYMMDD(new Date(baseYear, 7, 1)); // Aug 1
  const end = formatYYYYMMDD(new Date(baseYear + 1, 6, 31)); // Jul 31
  return { start, end };
}

function inferAcademicBaseYear(today: Date) {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0..11
  return m >= 7 ? y : y - 1;
}

export default function CalendarScreen() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const [mode, setMode] = useState<CalendarMode>("calendar");

  // Calendar details modal (demo items)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AnyItem | null>(null);

  // Taxi state
  const [taxiWeekStart, setTaxiWeekStart] = useState<Date>(startOfWeek(today));
  const [taxiEntries, setTaxiEntries] = useState<TaxiEntry[]>([]);
  const [taxiLoaded, setTaxiLoaded] = useState(false);

  // Taxi modals
  const [taxiFormOpen, setTaxiFormOpen] = useState(false);
  const [taxiEditingId, setTaxiEditingId] = useState<string | null>(null);

  const [taxiType, setTaxiType] = useState<"pickup" | "dropoff">("pickup");
  const [taxiDateISO, setTaxiDateISO] = useState<string>(formatYYYYMMDD(today));
  const [taxiTimeLabel, setTaxiTimeLabel] = useState<string>("");
  const [taxiWho, setTaxiWho] = useState<string>("");
  const [taxiNotes, setTaxiNotes] = useState<string>("");

  const [taxiDatePickerOpen, setTaxiDatePickerOpen] = useState(false);

  const [taxiDetailsOpen, setTaxiDetailsOpen] = useState(false);
  const [taxiSelectedId, setTaxiSelectedId] = useState<string | null>(null);

  // School state
  const [schoolBaseYear, setSchoolBaseYear] = useState<number>(inferAcademicBaseYear(today));
  const [schoolHolidays, setSchoolHolidays] = useState<SchoolHoliday[]>([]);
  const [schoolLoaded, setSchoolLoaded] = useState(false);

  // School modals
  const [holidayFormOpen, setHolidayFormOpen] = useState(false);
  const [holidayEditingId, setHolidayEditingId] = useState<string | null>(null);

  const [holidayName, setHolidayName] = useState<string>("");
  const [holidayStartISO, setHolidayStartISO] = useState<string>(formatYYYYMMDD(today));
  const [holidayEndISO, setHolidayEndISO] = useState<string>(formatYYYYMMDD(today));
  const [holidayNotes, setHolidayNotes] = useState<string>("");

  const [holidayStartPickerOpen, setHolidayStartPickerOpen] = useState(false);
  const [holidayEndPickerOpen, setHolidayEndPickerOpen] = useState(false);

  const [holidayDetailsOpen, setHolidayDetailsOpen] = useState(false);
  const [holidaySelectedId, setHolidaySelectedId] = useState<string | null>(null);

  // Calendar demo items (dev only)
  const devItems = useMemo<AnyItem[]>(() => {
    if (!__DEV__) return [];
    return [
      { id: "demo-all-day-1", kind: "allDay", title: "Sophie birthday", subtitle: "Card / gift", sourceLabel: "FamilySync", colorLabel: "Reserved", notes: "" },
      { id: "demo-scheduled-1", kind: "scheduled", timeLabel: "15:20", endTimeLabel: "16:00", title: "School pickup", subtitle: "Main gate", sourceLabel: "FamilySync", colorLabel: "Reserved", notes: "" },
      { id: "demo-task-1", kind: "task", title: "Buy party clothes", subtitle: "Before Friday", sourceLabel: "FamilySync", colorLabel: "Reserved", notes: "" },
    ];
  }, []);

  const allDayItems = devItems.filter((i): i is AllDayItem => i.kind === "allDay");
  const scheduledItems = devItems.filter((i): i is ScheduledItem => i.kind === "scheduled");
  const taskItems = devItems.filter((i): i is TaskItem => i.kind === "task");
  const calendarItemCount = allDayItems.length + scheduledItems.length + taskItems.length;

  // Calendar week/day context (existing scaffold)
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const monthLabel = useMemo(() => formatMonthYear(selectedDate), [selectedDate]);

  // Taxi derived
  const taxiWeekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(taxiWeekStart, i)), [taxiWeekStart]);
  const taxiWeekEntries = useMemo(() => {
    const startISO = formatYYYYMMDD(taxiWeekStart);
    const endISO = formatYYYYMMDD(addDays(taxiWeekStart, 6));
    return taxiEntries.filter((e) => e.dateISO >= startISO && e.dateISO <= endISO);
  }, [taxiEntries, taxiWeekStart]);

  const taxiEntriesByDay = useMemo(() => {
    const map: Record<string, { pickup: TaxiEntry[]; dropoff: TaxiEntry[] }> = {};
    for (const d of taxiWeekDays) map[formatYYYYMMDD(d)] = { pickup: [], dropoff: [] };
    for (const e of taxiWeekEntries) {
      if (!map[e.dateISO]) map[e.dateISO] = { pickup: [], dropoff: [] };
      map[e.dateISO][e.type].push(e);
    }
    for (const iso of Object.keys(map)) {
      map[iso].pickup.sort((a, b) => (a.timeLabel || "").localeCompare(b.timeLabel || ""));
      map[iso].dropoff.sort((a, b) => (a.timeLabel || "").localeCompare(b.timeLabel || ""));
    }
    return map;
  }, [taxiWeekEntries, taxiWeekDays]);

  const taxiSelected = useMemo(() => (taxiSelectedId ? taxiEntries.find((e) => e.id === taxiSelectedId) || null : null), [taxiEntries, taxiSelectedId]);

  // School derived
  const schoolYearLabel = useMemo(() => `${schoolBaseYear}/${schoolBaseYear + 1}`, [schoolBaseYear]);
  const schoolFiltered = useMemo(() => {
    const { start, end } = academicYearStartEnd(schoolBaseYear);
    return schoolHolidays.filter((h) => h.startISO >= start && h.startISO <= end).sort((a, b) => compareISO(a.startISO, b.startISO));
  }, [schoolHolidays, schoolBaseYear]);
  const holidaySelected = useMemo(() => (holidaySelectedId ? schoolHolidays.find((h) => h.id === holidaySelectedId) || null : null), [schoolHolidays, holidaySelectedId]);

  // Load persisted state (once)
  useEffect(() => {
    let mounted = true;

    async function loadTaxi() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_TAXI);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setTaxiEntries(parsed as TaxiEntry[]);
        }
      } catch {
      } finally {
        if (mounted) setTaxiLoaded(true);
      }
    }

    async function loadSchool() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_SCHOOL);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setSchoolHolidays(parsed as SchoolHoliday[]);
        }
      } catch {
      } finally {
        if (mounted) setSchoolLoaded(true);
      }
    }

    loadTaxi();
    loadSchool();

    return () => {
      mounted = false;
    };
  }, []);

  // Persist on change (after load)
  useEffect(() => {
    if (!taxiLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_TAXI, JSON.stringify(taxiEntries)).catch(() => {
      Alert.alert("Couldn’t save changes", "Try again.");
    });
  }, [taxiEntries, taxiLoaded]);

  useEffect(() => {
    if (!schoolLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_SCHOOL, JSON.stringify(schoolHolidays)).catch(() => {
      Alert.alert("Couldn’t save changes", "Try again.");
    });
  }, [schoolHolidays, schoolLoaded]);

  // Calendar actions
  function goToToday() { setSelectedDate(today); }
  function goPrevMonth() { setSelectedDate((prev) => startOfDay(addMonthsClamp(prev, -1))); }
  function goNextMonth() { setSelectedDate((prev) => startOfDay(addMonthsClamp(prev, 1))); }
  function goPrevWeek() { setSelectedDate((prev) => startOfDay(addDays(prev, -7))); }
  function goNextWeek() { setSelectedDate((prev) => startOfDay(addDays(prev, 7))); }
  function onPressMonthMode() { Alert.alert("Coming soon", "Month view will be added in a later phase."); }
  function openCalendarDetails(item: AnyItem) { setSelectedItem(item); setDetailsOpen(true); }
  function closeCalendarDetails() { setDetailsOpen(false); setTimeout(() => setSelectedItem(null), 200); }

  const calendarModalMeta = useMemo(() => {
    if (!selectedItem) return "";
    if (selectedItem.kind === "allDay") return `${formatDayShort(selectedDate)} · All-day`;
    if (selectedItem.kind === "scheduled") {
      const end = selectedItem.endTimeLabel ? `–${selectedItem.endTimeLabel}` : "";
      const time = selectedItem.timeLabel && selectedItem.timeLabel !== "—" ? selectedItem.timeLabel : "Scheduled";
      return `${formatDayShort(selectedDate)} · ${time}${end}`;
    }
    return `${formatDayShort(selectedDate)} · Task (due)`;
  }, [selectedItem, selectedDate]);

  // Taxi actions
  function taxiPrevWeek() { setTaxiWeekStart((prev) => startOfDay(addDays(prev, -7))); }
  function taxiNextWeek() { setTaxiWeekStart((prev) => startOfDay(addDays(prev, 7))); }

  function openTaxiAdd() {
    setTaxiEditingId(null);
    setTaxiType("pickup");
    setTaxiDateISO(formatYYYYMMDD(startOfDay(taxiWeekStart)));
    setTaxiTimeLabel("");
    setTaxiWho("");
    setTaxiNotes("");
    setTaxiFormOpen(true);
  }

  function openTaxiEdit(entry: TaxiEntry) {
    setTaxiEditingId(entry.id);
    setTaxiType(entry.type);
    setTaxiDateISO(entry.dateISO);
    setTaxiTimeLabel(entry.timeLabel || "");
    setTaxiWho(entry.who);
    setTaxiNotes(entry.notes || "");
    setTaxiFormOpen(true);
  }

  function saveTaxiEntry() {
    const who = taxiWho.trim();
    const dateISO = taxiDateISO;
    if (!who) return;

    const now = Date.now();
    if (taxiEditingId) {
      setTaxiEntries((prev) =>
        prev.map((e) =>
          e.id === taxiEditingId
            ? { ...e, type: taxiType, dateISO, timeLabel: taxiTimeLabel.trim() || undefined, who, notes: taxiNotes.trim() || undefined, updatedAt: now }
            : e
        )
      );
    } else {
      const entry: TaxiEntry = {
        id: genId("taxi"),
        type: taxiType,
        dateISO,
        timeLabel: taxiTimeLabel.trim() || undefined,
        who,
        notes: taxiNotes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setTaxiEntries((prev) => [entry, ...prev]);
    }
    setTaxiFormOpen(false);
  }

  function confirmDeleteTaxi(entry: TaxiEntry) {
    Alert.alert("Delete entry?", "This will remove it from your schedule.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { setTaxiEntries((prev) => prev.filter((e) => e.id !== entry.id)); setTaxiDetailsOpen(false); setTaxiSelectedId(null); } },
    ]);
  }

  // School actions
  function schoolPrevYear() { setSchoolBaseYear((y) => y - 1); }
  function schoolNextYear() { setSchoolBaseYear((y) => y + 1); }

  function openHolidayAdd() {
    setHolidayEditingId(null);
    setHolidayName("");
    const iso = formatYYYYMMDD(today);
    setHolidayStartISO(iso);
    setHolidayEndISO(iso);
    setHolidayNotes("");
    setHolidayFormOpen(true);
  }

  function openHolidayEdit(h: SchoolHoliday) {
    setHolidayEditingId(h.id);
    setHolidayName(h.name);
    setHolidayStartISO(h.startISO);
    setHolidayEndISO(h.endISO);
    setHolidayNotes(h.notes || "");
    setHolidayFormOpen(true);
  }

  const holidayDateError = useMemo(() => (holidayEndISO < holidayStartISO ? "End date must be after start date" : ""), [holidayStartISO, holidayEndISO]);

  function saveHoliday() {
    const name = holidayName.trim();
    if (!name) return;
    if (holidayEndISO < holidayStartISO) return;

    const now = Date.now();
    if (holidayEditingId) {
      setSchoolHolidays((prev) =>
        prev.map((h) =>
          h.id === holidayEditingId ? { ...h, name, startISO: holidayStartISO, endISO: holidayEndISO, notes: holidayNotes.trim() || undefined, updatedAt: now } : h
        )
      );
    } else {
      const h: SchoolHoliday = {
        id: genId("holiday"),
        name,
        startISO: holidayStartISO,
        endISO: holidayEndISO,
        notes: holidayNotes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setSchoolHolidays((prev) => [h, ...prev]);
    }
    setHolidayFormOpen(false);
  }

  function confirmDeleteHoliday(h: SchoolHoliday) {
    Alert.alert("Delete holiday?", "This will remove it from your list.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { setSchoolHolidays((prev) => prev.filter((x) => x.id !== h.id)); setHolidayDetailsOpen(false); setHolidaySelectedId(null); } },
    ]);
  }

  // Ensure content doesn't hide behind pinned mode bar
  const scrollBottomPadding = useMemo(() => MODE_BAR_HEIGHT + 22, []);

  // Helpers: open details
  function openTaxiDetails(id: string) { setTaxiSelectedId(id); setTaxiDetailsOpen(true); }
  function closeTaxiDetails() { setTaxiDetailsOpen(false); setTimeout(() => setTaxiSelectedId(null), 200); }
  function openHolidayDetails(id: string) { setHolidaySelectedId(id); setHolidayDetailsOpen(true); }
  function closeHolidayDetails() { setHolidayDetailsOpen(false); setTimeout(() => setHolidaySelectedId(null), 200); }

  function ModeButton({ label, value }: { label: string; value: CalendarMode }) {
    const selected = mode === value;
    return (
      <Pressable onPress={() => setMode(value)} style={({ pressed }) => [styles.modeBarItem, selected && styles.modeBarItemSelected, pressed && styles.pressed]}>
        <Text style={[styles.modeBarText, selected && styles.modeBarTextSelected]}>{label}</Text>
      </Pressable>
    );
  }

  function CalendarView() {
    return (
      <>
        <View style={styles.monthHeader}>
          <Pressable onPress={goPrevMonth} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}><Text style={styles.iconBtnText}>‹</Text></Pressable>
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <Pressable onPress={goNextMonth} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}><Text style={styles.iconBtnText}>›</Text></Pressable>
        </View>

        <View style={styles.modeRow}>
          <View style={styles.modePill}>
            <Pressable onPress={onPressMonthMode} style={({ pressed }) => [styles.modeItem, pressed && styles.pressed]}>
              <Text style={styles.modeTextMuted}>Month</Text><Text style={styles.modeSubtle}>soon</Text>
            </Pressable>
            <View style={styles.modeDivider} />
            <View style={[styles.modeItem, styles.modeItemSelected]}>
              <Text style={styles.modeText}>Week</Text><Text style={styles.modeSubtle}>current</Text>
            </View>
          </View>

          <Pressable onPress={goToToday} style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}><Text style={styles.todayBtnText}>Today</Text></Pressable>
        </View>

        <View style={styles.weekRow}>
          <Pressable onPress={goPrevWeek} style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}><Text style={styles.weekNavText}>‹</Text></Pressable>

          <View style={styles.weekStrip}>
            {weekDays.map((d) => {
              const isSelected = isSameDay(d, selectedDate);
              const isToday = isSameDay(d, today);
              return (
                <Pressable
                  key={`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`}
                  onPress={() => setSelectedDate(startOfDay(d))}
                  style={({ pressed }) => [styles.dayCell, isSelected && styles.dayCellSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.dayDow, isSelected && styles.dayTextSelected]}>{formatShortWeekday(d)}</Text>
                  <Text style={[styles.dayNum, isSelected && styles.dayTextSelected]}>{d.getDate()}</Text>
                  {isToday ? <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} /> : <View style={styles.todayDotPlaceholder} />}
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={goNextWeek} style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}><Text style={styles.weekNavText}>›</Text></Pressable>
        </View>

        <View style={styles.daySheet}>
          <View style={styles.daySheetHeader}>
            <Text style={styles.dayTitle}>{formatDayTitle(selectedDate)}</Text>
            <View style={styles.countPill}><Text style={styles.countPillText}>{calendarItemCount} items</Text></View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All-day</Text>
            {allDayItems.length === 0 ? <Text style={styles.emptyText}>No all-day items</Text> : allDayItems.map((it) => (
              <Pressable key={it.id} onPress={() => openCalendarDetails(it)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={styles.sourceBar} />
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{it.title}</Text>
                  {!!it.subtitle && <Text style={styles.rowSub}>{it.subtitle}</Text>}
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionDivider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scheduled</Text>
            {scheduledItems.length === 0 ? <Text style={styles.emptyText}>Nothing scheduled</Text> : scheduledItems.map((it) => (
              <Pressable key={it.id} onPress={() => openCalendarDetails(it)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Text style={styles.timeLabel}>{it.timeLabel}</Text>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{it.title}</Text>
                  {!!it.subtitle && <Text style={styles.rowSub}>{it.subtitle}</Text>}
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionDivider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            {taskItems.length === 0 ? <Text style={styles.emptyText}>No tasks due</Text> : taskItems.map((it) => (
              <Pressable key={it.id} onPress={() => openCalendarDetails(it)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={styles.taskDot} />
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{it.title}</Text>
                  {!!it.subtitle && <Text style={styles.rowSub}>{it.subtitle}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </>
    );
  }

  function TaxiView() {
    return (
      <>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Taxi</Text>
            <Text style={styles.pageSub}>{formatWeekRangeLabel(taxiWeekStart)}</Text>
          </View>
          <Pressable onPress={openTaxiAdd} style={({ pressed }) => [styles.smallPrimaryBtn, pressed && styles.pressed]}>
            <Text style={styles.smallPrimaryBtnText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.weekNavRow}>
          <Pressable onPress={taxiPrevWeek} style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}><Text style={styles.weekNavText}>‹</Text></Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={taxiNextWeek} style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}><Text style={styles.weekNavText}>›</Text></Pressable>
        </View>

        {taxiWeekDays.map((d) => {
          const iso = formatYYYYMMDD(d);
          const byType = taxiEntriesByDay[iso] || { pickup: [], dropoff: [] };
          const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(d);

          return (
            <View key={iso} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{dayLabel}</Text>
                <Text style={styles.cardMeta}>{formatDisplayDMY(d)}</Text>
              </View>

              <View style={styles.cardSection}>
                <Text style={styles.cardSectionTitle}>Pickup</Text>
                {byType.pickup.length === 0 ? <Text style={styles.cardEmpty}>No pickup</Text> : byType.pickup.map((e) => (
                  <Pressable key={e.id} onPress={() => openTaxiDetails(e.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                    <Text style={styles.timeLabel}>{safeLabel(e.timeLabel, "—")}</Text>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{e.who}</Text>
                      {!!e.notes && <Text style={styles.rowSub}>{e.notes}</Text>}
                    </View>
                  </Pressable>
                ))}
              </View>

              <View style={styles.sectionDivider} />

              <View style={styles.cardSection}>
                <Text style={styles.cardSectionTitle}>Drop-off</Text>
                {byType.dropoff.length === 0 ? <Text style={styles.cardEmpty}>No drop-off</Text> : byType.dropoff.map((e) => (
                  <Pressable key={e.id} onPress={() => openTaxiDetails(e.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                    <Text style={styles.timeLabel}>{safeLabel(e.timeLabel, "—")}</Text>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{e.who}</Text>
                      {!!e.notes && <Text style={styles.rowSub}>{e.notes}</Text>}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </>
    );
  }

  function SchoolView() {
    return (
      <>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>School holidays</Text>
            <Text style={styles.pageSub}>Academic year {schoolYearLabel}</Text>
          </View>
          <Pressable onPress={openHolidayAdd} style={({ pressed }) => [styles.smallPrimaryBtn, pressed && styles.pressed]}>
            <Text style={styles.smallPrimaryBtnText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.weekNavRow}>
          <Pressable onPress={schoolPrevYear} style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}><Text style={styles.weekNavText}>‹</Text></Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={schoolNextYear} style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}><Text style={styles.weekNavText}>›</Text></Pressable>
        </View>

        {schoolFiltered.length === 0 ? (
          <View style={styles.card}><Text style={styles.cardEmpty}>No holidays added yet</Text></View>
        ) : (
          schoolFiltered.map((h) => (
            <Pressable key={h.id} onPress={() => openHolidayDetails(h.id)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{h.name}</Text>
                <Text style={styles.cardMeta}>{formatDisplayFromYYYYMMDD(h.startISO)} – {formatDisplayFromYYYYMMDD(h.endISO)}</Text>
              </View>
              {!!h.notes && <Text style={styles.cardNotes}>{h.notes}</Text>}
            </Pressable>
          ))
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: scrollBottomPadding }]}>
          {mode === "calendar" ? <CalendarView /> : null}
          {mode === "taxi" ? <TaxiView /> : null}
          {mode === "school" ? <SchoolView /> : null}
        </ScrollView>

        <View style={styles.modeBarOuter}>
          <View style={styles.modeBarInner}>
            <ModeButton label="Calendar" value="calendar" />
            <ModeButton label="Taxi" value="taxi" />
            <ModeButton label="School" value="school" />
          </View>
        </View>

        {/* Calendar details modal */}
        <Modal visible={detailsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeCalendarDetails}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }} />
              <Pressable onPress={closeCalendarDetails} style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}>
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedItem?.title ?? ""}</Text>
              <Text style={styles.modalMeta}>{calendarModalMeta}</Text>

              {!!selectedItem?.subtitle && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Subtitle</Text>
                  <Text style={styles.detailValue}>{selectedItem.subtitle}</Text>
                </View>
              )}

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{safeLabel(selectedItem?.notes, "None")}</Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Reminder</Text>
                <Text style={styles.detailValue}>None</Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Source</Text>
                <Text style={styles.detailValue}>{safeLabel(selectedItem?.sourceLabel, "FamilySync")}</Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Color</Text>
                <Text style={styles.detailValue}>{safeLabel(selectedItem?.colorLabel, "Reserved")}</Text>
              </View>

              <Text style={styles.modalFootnote}>Phase 1 scaffold — editing and imports will be added later.</Text>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Taxi form modal */}
        <Modal visible={taxiFormOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTaxiFormOpen(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setTaxiFormOpen(false)} style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}><Text style={styles.headerBtnText}>Cancel</Text></Pressable>
              <Text style={styles.headerTitle}>{taxiEditingId ? "Edit entry" : "Add entry"}</Text>
              <Pressable onPress={saveTaxiEntry} disabled={!taxiWho.trim()} style={({ pressed }) => [styles.headerBtn, !taxiWho.trim() && styles.disabledBtn, pressed && styles.pressed]}>
                <Text style={[styles.headerBtnText, !taxiWho.trim() && styles.disabledBtnText]}>Save</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.segment}>
                  <Pressable onPress={() => setTaxiType("pickup")} style={({ pressed }) => [styles.segmentItem, taxiType === "pickup" && styles.segmentItemSelected, pressed && styles.pressed]}>
                    <Text style={[styles.segmentText, taxiType === "pickup" && styles.segmentTextSelected]}>Pickup</Text>
                  </Pressable>
                  <Pressable onPress={() => setTaxiType("dropoff")} style={({ pressed }) => [styles.segmentItem, taxiType === "dropoff" && styles.segmentItemSelected, pressed && styles.pressed]}>
                    <Text style={[styles.segmentText, taxiType === "dropoff" && styles.segmentTextSelected]}>Drop-off</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Date</Text>
                <Pressable onPress={() => setTaxiDatePickerOpen(true)} style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}>
                  <Text style={styles.inputLikeText}>{formatDisplayFromYYYYMMDD(taxiDateISO)}</Text>
                </Pressable>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Time (optional)</Text>
                <TextInput value={taxiTimeLabel} onChangeText={setTaxiTimeLabel} placeholder="15:20" placeholderTextColor="#9CA3AF" style={styles.textInput} />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Who</Text>
                <TextInput value={taxiWho} onChangeText={setTaxiWho} placeholder="e.g. Mark" placeholderTextColor="#9CA3AF" style={styles.textInput} />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Notes (optional)</Text>
                <TextInput value={taxiNotes} onChangeText={setTaxiNotes} placeholder="Optional" placeholderTextColor="#9CA3AF" style={[styles.textInput, { height: 90 }]} multiline />
              </View>

              <Text style={styles.modalFootnote}>Dates use the canonical picker. Time is free text in Phase 1.</Text>
            </ScrollView>

            <DatePickerModal
              visible={taxiDatePickerOpen}
              title="Select date"
              initialDate={parseYYYYMMDD(taxiDateISO) || today}
              onCancel={() => setTaxiDatePickerOpen(false)}
              onConfirm={(d) => { setTaxiDatePickerOpen(false); setTaxiDateISO(formatYYYYMMDD(startOfDay(d))); }}
            />
          </SafeAreaView>
        </Modal>

        {/* Taxi details modal */}
        <Modal visible={taxiDetailsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTaxiDetailsOpen(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setTaxiDetailsOpen(false)} style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}><Text style={styles.headerBtnText}>Done</Text></Pressable>
              <Text style={styles.headerTitle}>Entry</Text>
              <View style={{ width: 56 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {taxiSelected ? (
                <>
                  <Text style={styles.modalTitle}>{taxiSelected.type === "pickup" ? "Pickup" : "Drop-off"} · {taxiSelected.who}</Text>
                  <Text style={styles.modalMeta}>{formatDisplayFromYYYYMMDD(taxiSelected.dateISO)} · {safeLabel(taxiSelected.timeLabel, "—")}</Text>

                  {!!taxiSelected.notes && (
                    <View style={styles.detailCard}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>{taxiSelected.notes}</Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <Pressable onPress={() => { setTaxiDetailsOpen(false); openTaxiEdit(taxiSelected); }} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                      <Text style={styles.secondaryBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDeleteTaxi(taxiSelected)} style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}>
                      <Text style={styles.dangerBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Text style={styles.cardEmpty}>Entry not found.</Text>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Holiday form modal */}
        <Modal visible={holidayFormOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHolidayFormOpen(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setHolidayFormOpen(false)} style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}><Text style={styles.headerBtnText}>Cancel</Text></Pressable>
              <Text style={styles.headerTitle}>{holidayEditingId ? "Edit holiday" : "Add holiday"}</Text>
              <Pressable
                onPress={saveHoliday}
                disabled={!holidayName.trim() || !!holidayDateError}
                style={({ pressed }) => [styles.headerBtn, (!holidayName.trim() || !!holidayDateError) && styles.disabledBtn, pressed && styles.pressed]}
              >
                <Text style={[styles.headerBtnText, (!holidayName.trim() || !!holidayDateError) && styles.disabledBtnText]}>Save</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput value={holidayName} onChangeText={setHolidayName} placeholder="e.g. Christmas break" placeholderTextColor="#9CA3AF" style={styles.textInput} />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Start date</Text>
                <Pressable onPress={() => setHolidayStartPickerOpen(true)} style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}>
                  <Text style={styles.inputLikeText}>{formatDisplayFromYYYYMMDD(holidayStartISO)}</Text>
                </Pressable>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>End date</Text>
                <Pressable onPress={() => setHolidayEndPickerOpen(true)} style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}>
                  <Text style={styles.inputLikeText}>{formatDisplayFromYYYYMMDD(holidayEndISO)}</Text>
                </Pressable>
              </View>

              {!!holidayDateError && <Text style={styles.errorText}>{holidayDateError}</Text>}

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Notes (optional)</Text>
                <TextInput value={holidayNotes} onChangeText={setHolidayNotes} placeholder="Optional" placeholderTextColor="#9CA3AF" style={[styles.textInput, { height: 90 }]} multiline />
              </View>

              <Text style={styles.modalFootnote}>Dates use the canonical picker.</Text>
            </ScrollView>

            <DatePickerModal
              visible={holidayStartPickerOpen}
              title="Select start date"
              initialDate={parseYYYYMMDD(holidayStartISO) || today}
              onCancel={() => setHolidayStartPickerOpen(false)}
              onConfirm={(d) => {
                const iso = formatYYYYMMDD(startOfDay(d));
                setHolidayStartPickerOpen(false);
                setHolidayStartISO(iso);
                if (holidayEndISO < iso) setHolidayEndISO(iso);
              }}
            />

            <DatePickerModal
              visible={holidayEndPickerOpen}
              title="Select end date"
              initialDate={parseYYYYMMDD(holidayEndISO) || today}
              onCancel={() => setHolidayEndPickerOpen(false)}
              onConfirm={(d) => { setHolidayEndPickerOpen(false); setHolidayEndISO(formatYYYYMMDD(startOfDay(d))); }}
            />
          </SafeAreaView>
        </Modal>

        {/* Holiday details modal */}
        <Modal visible={holidayDetailsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHolidayDetailsOpen(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setHolidayDetailsOpen(false)} style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}><Text style={styles.headerBtnText}>Done</Text></Pressable>
              <Text style={styles.headerTitle}>Holiday</Text>
              <View style={{ width: 56 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {holidaySelected ? (
                <>
                  <Text style={styles.modalTitle}>{holidaySelected.name}</Text>
                  <Text style={styles.modalMeta}>{formatDisplayFromYYYYMMDD(holidaySelected.startISO)} – {formatDisplayFromYYYYMMDD(holidaySelected.endISO)}</Text>

                  {!!holidaySelected.notes && (
                    <View style={styles.detailCard}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>{holidaySelected.notes}</Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <Pressable onPress={() => { setHolidayDetailsOpen(false); openHolidayEdit(holidaySelected); }} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                      <Text style={styles.secondaryBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDeleteHoliday(holidaySelected)} style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}>
                      <Text style={styles.dangerBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Text style={styles.cardEmpty}>Holiday not found.</Text>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const MODE_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  root: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },

  modeBarOuter: { height: MODE_BAR_HEIGHT, paddingHorizontal: 16, paddingBottom: 6, paddingTop: 8, backgroundColor: "#FFFFFF" },
  modeBarInner: { flex: 1, borderRadius: 18, backgroundColor: "#F4F4F6", flexDirection: "row", overflow: "hidden" },
  modeBarItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  modeBarItemSelected: { backgroundColor: "#121214" },
  modeBarText: { fontSize: 14, fontWeight: "800", color: "#5F5F66" },
  modeBarTextSelected: { color: "#FFFFFF" },

  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  monthTitle: { fontSize: 22, fontWeight: "700", letterSpacing: 0.2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F4F6" },
  iconBtnText: { fontSize: 28, lineHeight: 28, fontWeight: "600" },

  modeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modePill: { flexDirection: "row", alignItems: "center", borderRadius: 14, backgroundColor: "#F4F4F6", overflow: "hidden" },
  modeItem: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "baseline", gap: 6 },
  modeItemSelected: { backgroundColor: "#FFFFFF" },
  modeDivider: { width: 1, height: 18, backgroundColor: "#D9D9DE" },
  modeText: { fontSize: 14, fontWeight: "700" },
  modeTextMuted: { fontSize: 14, fontWeight: "700", color: "#5F5F66" },
  modeSubtle: { fontSize: 12, color: "#7A7A83", fontWeight: "600" },

  todayBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: "#F4F4F6" },
  todayBtnText: { fontSize: 14, fontWeight: "700" },

  weekRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  weekNavRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  weekNavBtn: { width: 34, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F4F6" },
  weekNavText: { fontSize: 22, lineHeight: 22, fontWeight: "800", color: "#121214" },

  weekStrip: { flex: 1, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  dayCell: { flex: 1, borderRadius: 16, paddingVertical: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7F9" },
  dayCellSelected: { backgroundColor: "#121214" },
  dayDow: { fontSize: 12, color: "#5F5F66", fontWeight: "700" },
  dayNum: { fontSize: 16, fontWeight: "800", marginTop: 2, color: "#121214" },
  dayTextSelected: { color: "#FFFFFF" },
  todayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, backgroundColor: "#121214" },
  todayDotSelected: { backgroundColor: "#FFFFFF" },
  todayDotPlaceholder: { width: 6, height: 6, borderRadius: 3, marginTop: 6, backgroundColor: "transparent" },

  daySheet: { borderRadius: 18, backgroundColor: "#F7F7F9", padding: 16 },
  daySheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 },
  dayTitle: { fontSize: 18, fontWeight: "800", flex: 1 },
  countPill: { backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  countPillText: { fontSize: 13, fontWeight: "800", color: "#5F5F66" },

  section: { marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#5F5F66", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#7A7A83", lineHeight: 20, paddingBottom: 4 },
  sectionDivider: { height: 1, backgroundColor: "#E2E2E8", marginVertical: 14 },

  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 14, backgroundColor: "#FFFFFF", marginBottom: 8 },
  sourceBar: { width: 4, height: 32, borderRadius: 2, backgroundColor: "#D9D9DE" },
  timeLabel: { width: 54, fontSize: 13, fontWeight: "800", color: "#5F5F66" },
  taskDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#D9D9DE" },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "800", color: "#121214" },
  rowSub: { marginTop: 2, fontSize: 13, color: "#7A7A83" },

  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  pageTitle: { fontSize: 22, fontWeight: "900", color: "#121214" },
  pageSub: { marginTop: 6, fontSize: 14, fontWeight: "700", color: "#7A7A83" },

  card: { marginTop: 12, borderRadius: 18, backgroundColor: "#F7F7F9", padding: 14 },
  cardHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: "900", color: "#121214", flex: 1 },
  cardMeta: { fontSize: 12, fontWeight: "800", color: "#7A7A83" },
  cardNotes: { marginTop: 8, fontSize: 13, fontWeight: "700", color: "#5F5F66", lineHeight: 18 },
  cardSection: { marginTop: 2 },
  cardSectionTitle: { fontSize: 12, fontWeight: "900", color: "#5F5F66", marginBottom: 8 },
  cardEmpty: { marginTop: 6, fontSize: 14, fontWeight: "700", color: "#7A7A83" },

  smallPrimaryBtn: { borderRadius: 14, backgroundColor: "#121214", paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  smallPrimaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },

  modalSafe: { flex: 1, backgroundColor: "#FFFFFF" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 10 },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F4F4F6", minWidth: 56, alignItems: "center", justifyContent: "center" },
  headerBtnText: { fontSize: 14, fontWeight: "900", color: "#111827" },
  headerTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  disabledBtn: { backgroundColor: "#F4F4F6", opacity: 0.6 },
  disabledBtnText: { color: "#9CA3AF" },

  doneBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F4F4F6" },
  doneBtnText: { fontSize: 15, fontWeight: "800" },
  modalContent: { padding: 16, paddingBottom: 32 },
  modalTitle: { fontSize: 26, fontWeight: "900", letterSpacing: 0.2, marginTop: 8 },
  modalMeta: { marginTop: 10, fontSize: 14, color: "#5F5F66", fontWeight: "700" },

  formSection: { marginTop: 16 },
  formLabel: { fontSize: 12, fontWeight: "900", color: "#5F5F66", marginBottom: 8 },
  textInput: { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontWeight: "700", color: "#111827" },
  inputLike: { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 14 },
  inputLikeText: { fontSize: 15, fontWeight: "800", color: "#111827" },

  segment: { flexDirection: "row", borderRadius: 14, backgroundColor: "#F4F4F6", overflow: "hidden" },
  segmentItem: { flex: 1, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  segmentItemSelected: { backgroundColor: "#121214" },
  segmentText: { fontSize: 14, fontWeight: "900", color: "#5F5F66" },
  segmentTextSelected: { color: "#FFFFFF" },

  errorText: { marginTop: 10, color: "#B91C1C", fontWeight: "900" },

  detailCard: { marginTop: 14, borderRadius: 16, backgroundColor: "#F7F7F9", padding: 14 },
  detailLabel: { fontSize: 12, fontWeight: "800", color: "#5F5F66", marginBottom: 6 },
  detailValue: { fontSize: 15, fontWeight: "800", color: "#121214", lineHeight: 20 },
  modalFootnote: { marginTop: 18, fontSize: 13, color: "#7A7A83", lineHeight: 18 },

  actionRow: { marginTop: 18, flexDirection: "row", gap: 12 },
  secondaryBtn: { flex: 1, borderRadius: 16, backgroundColor: "#F4F4F6", paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 14, fontWeight: "900", color: "#111827" },
  dangerBtn: { flex: 1, borderRadius: 16, backgroundColor: "#111827", paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  dangerBtnText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },

  pressed: { opacity: 0.75 },
});
