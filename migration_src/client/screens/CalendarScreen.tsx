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
  Switch,
  View,
  ActionSheetIOS,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import DatePickerModal, {
  formatDisplayDMY,
  formatDisplayFromYYYYMMDD,
  formatYYYYMMDD,
  parseYYYYMMDD,
} from "../components/DatePickerModal";

/**
 * Calendar v1.5.2 (Phase 1 thin slice)
 * - Internal mini-tabs within Calendar tab (LOCKED): Calendar | School runs | School holidays
 * - School runs v1 (Local MVP, persisted):
 *   - Add / view (week) / edit / delete pickup & drop-off entries
 *   - Category: School | Clubs | Other
 *   - Date selection uses canonical DatePickerModal
 *   - Time is free-text (no new time picker in Phase 1)
 *   - Header label:
 *       - Current week => "This week"
 *       - Other weeks => date range only
 * - School holidays v1 (Local MVP, persisted):
 *   - Add / view (academic year) / edit / delete holiday ranges
 *   - Between arrows shows ONLY "YYYY/YYYY" (no extra date range)
 *   - Start/end date selection uses canonical DatePickerModal
 * - Calendar view remains primary; School runs / holidays auto-surface into Calendar day view (local-only).
 *
 * Storage (AsyncStorage):
 *  - fs.taxi.v1        (kept for backward compatibility)
 *  - fs.schoolHolidays.v1
 *
 * NOTE:
 *  - No Supabase wiring
 *  - No alternative date pickers allowed
 */

const WEEK_STARTS_ON_MONDAY = true;

const STORAGE_KEY_RUNS = "fs.taxi.v1";
const STORAGE_KEY_RUNS_PEOPLE = "fs.runs.people.v1";
const STORAGE_KEY_SCHOOL = "fs.schoolHolidays.v1";
const STORAGE_KEY_SCHOOL_YEAR_LABEL_MODE = "fs.calendar.schoolYearLabelMode.v1";

type CalendarMode = "calendar" | "runs" | "holidays";

/** Calendar demo items (dev only scaffold) */
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
type ScheduledItem = BaseItem & {
  kind: "scheduled";
  timeLabel: string;
  endTimeLabel?: string;
};
type TaskItem = BaseItem & { kind: "task" };
type AnyItem = AllDayItem | ScheduledItem | TaskItem;

/** School runs */
type RunCategory = "school" | "clubs" | "other";
type RunEntry = {
  id: string;
  type: "pickup" | "dropoff";
  category: RunCategory;
  dateISO: string; // YYYY-MM-DD
  timeLabel?: string; // free text
  who: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

/** School holidays */
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

function categoryLabel(c: RunCategory) {
  if (c === "school") return "School";
  if (c === "clubs") return "Clubs";
  return "Other";
}

export default function CalendarScreen(props: any) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const routeParams = props?.route?.params ?? {};
  const initialMode: CalendarMode = routeParams?.initialMode === "runs" ? "runs" : "calendar";
  const [mode, setMode] = useState<CalendarMode>(initialMode);

  useEffect(() => {
    // Clear params after first mount so state restore doesn't keep forcing a mode.
    if (routeParams?.initialMode) {
      props?.navigation?.setParams?.({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calendar details modal (demo items + local merged)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AnyItem | null>(null);

  // Runs state
  const currentRunsWeekStart = useMemo(() => startOfWeek(today), [today]);
  const [runsWeekStart, setRunsWeekStart] = useState<Date>(currentRunsWeekStart);
  const [runsEntries, setRunsEntries] = useState<RunEntry[]>([]);
  const [runsLoaded, setRunsLoaded] = useState(false);

  // Runs modals
  const [runsFormOpen, setRunsFormOpen] = useState(false);
  const [runsEditingId, setRunsEditingId] = useState<string | null>(null);

  const [runsType, setRunsType] = useState<"pickup" | "dropoff">("pickup");
  const [runsCategory, setRunsCategory] = useState<RunCategory>("school");
  const [runsDateISO, setRunsDateISO] = useState<string>(formatYYYYMMDD(today));
  const [runsTimeLabel, setRunsTimeLabel] = useState<string>("");
  const [runsWho, setRunsWho] = useState<string>("");
  const [runsOtherSave, setRunsOtherSave] = useState(false);


  // "Who's doing the run?" (Phase 1): picker backed by local Settings list + "Other…"
  const WHO_OTHER = "__OTHER__";
  const [runsWhoChoice, setRunsWhoChoice] = useState<string>(""); // either a name, "You", or WHO_OTHER
  const [runsWhoPickerOpen, setRunsWhoPickerOpen] = useState(false);
  const [runsPeople, setRunsPeople] = useState<string[]>([]);
  const [runsPeopleLoaded, setRunsPeopleLoaded] = useState(false);


  const [defaultWho, setDefaultWho] = useState<string>("You");

  useEffect(() => {
    let mounted = true;

    async function loadDefaultWho() {
      const keys = [
        "fs.profile.v1",
        "fs.user.v1",
        "fs.onboarding.v1",
        "fs.onboarding.profile",
        "fs.account.v1",
        "fs.settings.v1",
      ];

      try {
        const pairs = await AsyncStorage.multiGet(keys);

        const pickName = (raw: string) => {
          const s = (raw || "").trim();
          if (!s) return "";
          if (s.startsWith("{") || s.startsWith("[")) {
            try {
              const obj: any = JSON.parse(s);
              if (obj && typeof obj === "object") {
                const candidates = [
                  obj.screenName,
                  obj.fullName,
                  obj.name,
                  obj.displayName,
                  obj.profile?.screenName,
                  obj.profile?.fullName,
                  obj.profile?.name,
                ];
                for (const c of candidates) {
                  if (typeof c === "string" && c.trim()) return c.trim();
                }
              }
            } catch {}
            return "";
          }
          return s;
        };

        for (const [, raw] of pairs) {
          if (!raw) continue;
          const name = pickName(raw);
          if (name) {
            if (mounted) setDefaultWho(name);
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    loadDefaultWho();

    return () => {
      mounted = false;
    };
  }, []);

  const [runsNotes, setRunsNotes] = useState<string>("");

  const [runsDatePickerOpen, setRunsDatePickerOpen] = useState(false);

  const [runsDetailsOpen, setRunsDetailsOpen] = useState(false);
  const [runsSelectedId, setRunsSelectedId] = useState<string | null>(null);

  // Holidays state
  const [schoolBaseYear, setSchoolBaseYear] = useState<number>(inferAcademicBaseYear(today));
  const [schoolHolidays, setSchoolHolidays] = useState<SchoolHoliday[]>([]);
  const [schoolLoaded, setSchoolLoaded] = useState(false);

  // Holidays modals
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
      {
        id: "demo-all-day-1",
        kind: "allDay",
        title: "Sophie birthday",
        subtitle: "Card / gift",
        sourceLabel: "FamilySync",
        colorLabel: "Reserved",
        notes: "",
      },
      {
        id: "demo-scheduled-1",
        kind: "scheduled",
        timeLabel: "15:20",
        endTimeLabel: "16:00",
        title: "School pickup",
        subtitle: "Main gate",
        sourceLabel: "FamilySync",
        colorLabel: "Reserved",
        notes: "",
      },
      {
        id: "demo-task-1",
        kind: "task",
        title: "Buy party clothes",
        subtitle: "Before Friday",
        sourceLabel: "FamilySync",
        colorLabel: "Reserved",
        notes: "",
      },
    ];
  }, []);

  // Calendar week/day context
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const monthLabel = useMemo(() => formatMonthYear(selectedDate), [selectedDate]);

  // Runs derived
  const runsWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(runsWeekStart, i)),
    [runsWeekStart]
  );
  const runsWeekEntries = useMemo(() => {
    const startISO = formatYYYYMMDD(runsWeekStart);
    const endISO = formatYYYYMMDD(addDays(runsWeekStart, 6));
    return runsEntries.filter((e) => e.dateISO >= startISO && e.dateISO <= endISO);
  }, [runsEntries, runsWeekStart]);

  const runsEntriesByDay = useMemo(() => {
    const map: Record<
      string,
      { pickup: RunEntry[]; dropoff: RunEntry[] }
    > = {};
    for (const d of runsWeekDays) map[formatYYYYMMDD(d)] = { pickup: [], dropoff: [] };
    for (const e of runsWeekEntries) {
      if (!map[e.dateISO]) map[e.dateISO] = { pickup: [], dropoff: [] };
      map[e.dateISO][e.type].push(e);
    }
    for (const iso of Object.keys(map)) {
      map[iso].pickup.sort((a, b) => (a.timeLabel || "").localeCompare(b.timeLabel || ""));
      map[iso].dropoff.sort((a, b) => (a.timeLabel || "").localeCompare(b.timeLabel || ""));
    }
    return map;
  }, [runsWeekEntries, runsWeekDays]);

  const runsSelected = useMemo(
    () => (runsSelectedId ? runsEntries.find((e) => e.id === runsSelectedId) || null : null),
    [runsEntries, runsSelectedId]
  );

  const runsIsCurrentWeek = useMemo(
    () => formatYYYYMMDD(runsWeekStart) === formatYYYYMMDD(currentRunsWeekStart),
    [runsWeekStart, currentRunsWeekStart]
  );
  const runsHeaderSub = useMemo(
    () => (runsIsCurrentWeek ? "This week" : formatWeekRangeLabel(runsWeekStart)),
    [runsIsCurrentWeek, runsWeekStart]
  );
  const runsCenterLabel = runsHeaderSub;

  // Holidays derived
  const schoolYearLabel = useMemo(
    () => `${schoolBaseYear}/${schoolBaseYear + 1}`,
    [schoolBaseYear]
  );
  const schoolFiltered = useMemo(() => {
    const { start, end } = academicYearStartEnd(schoolBaseYear);
    return schoolHolidays
      .filter((h) => h.startISO >= start && h.startISO <= end)
      .sort((a, b) => compareISO(a.startISO, b.startISO));
  }, [schoolHolidays, schoolBaseYear]);
  const holidaySelected = useMemo(
    () => (holidaySelectedId ? schoolHolidays.find((h) => h.id === holidaySelectedId) || null : null),
    [schoolHolidays, holidaySelectedId]
  );

  // Auto-surface runs/holidays into Calendar day view (local-only, Phase 1)
  const runsForSelectedDay = useMemo(() => {
    const iso = formatYYYYMMDD(selectedDate);
    return runsEntries
      .filter((e) => e.dateISO === iso)
      .slice()
      .sort((a, b) => (a.timeLabel || "").localeCompare(b.timeLabel || ""));
  }, [runsEntries, selectedDate]);

  const holidaysForSelectedDay = useMemo(() => {
    const iso = formatYYYYMMDD(selectedDate);
    return schoolHolidays.filter((h) => h.startISO <= iso && iso <= h.endISO);
  }, [schoolHolidays, selectedDate]);

  // Merge into calendar sections
  const calendarAllDayItems = useMemo<AllDayItem[]>(() => {
    const fromDev = devItems.filter((i): i is AllDayItem => i.kind === "allDay");
    const fromHolidays: AllDayItem[] = holidaysForSelectedDay.map((h) => ({
      id: `holiday_${h.id}_${formatYYYYMMDD(selectedDate)}`,
      kind: "allDay",
      title: h.name,
      subtitle: "School holiday",
      sourceLabel: "FamilySync",
      colorLabel: "Reserved",
      notes: h.notes || "",
    }));
    return [...fromDev, ...fromHolidays];
  }, [devItems, holidaysForSelectedDay, selectedDate]);

  const calendarScheduledItems = useMemo<ScheduledItem[]>(() => {
    const fromDev = devItems.filter((i): i is ScheduledItem => i.kind === "scheduled");
    const fromRuns: ScheduledItem[] = runsForSelectedDay.map((e) => ({
      id: `run_${e.id}`,
      kind: "scheduled",
      timeLabel: safeLabel(e.timeLabel, "—"),
      title: `${categoryLabel(e.category)} run · ${e.type === "pickup" ? "Pickup" : "Drop-off"}`,
      subtitle: e.who,
      sourceLabel: "FamilySync",
      colorLabel: "Reserved",
      notes: e.notes || "",
    }));
    return [...fromDev, ...fromRuns];
  }, [devItems, runsForSelectedDay]);

  const calendarTaskItems = useMemo<TaskItem[]>(() => devItems.filter((i): i is TaskItem => i.kind === "task"), [devItems]);

  const calendarItemCount =
    calendarAllDayItems.length + calendarScheduledItems.length + calendarTaskItems.length;

  // Load persisted state (once)
  useEffect(() => {
    let mounted = true;

    async function loadRuns() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_RUNS);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Backward compatibility: older entries might not have category; default to "school"
            const normalized = (parsed as any[]).map((e) => ({
              ...e,
              category: (e.category as RunCategory) || "school",
            }));
            setRunsEntries(normalized as RunEntry[]);
          }
        }
      } catch {
      } finally {
        if (mounted) setRunsLoaded(true);
      }
    }

    async function loadPeople() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_RUNS_PEOPLE);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = (parsed as any[])
              .filter((x) => typeof x === "string")
              .map((s) => String(s).trim())
              .filter((s) => !!s && s.toLowerCase() !== "you")
              .slice(0, 20);
            setRunsPeople(cleaned);
          }
        }
      } catch {
      } finally {
        if (mounted) setRunsPeopleLoaded(true);
      }
    }

    async function loadSchoolYearMode() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_SCHOOL_YEAR_LABEL_MODE);
        if (!mounted) return;
        if (raw === "split" || raw === "single") setSchoolYearLabelMode(raw);
      } catch {
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

    loadRuns();
    loadPeople();
    loadSchool();

    return () => {
      mounted = false;
    };
  }, []);

  // Persist on change (after load)
  useEffect(() => {
    if (!runsLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_RUNS, JSON.stringify(runsEntries)).catch(() => {
      Alert.alert("Couldn’t save changes", "Try again.");
    });
  }, [runsEntries, runsLoaded]);

  useEffect(() => {
    if (!runsPeopleLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_RUNS_PEOPLE, JSON.stringify(runsPeople)).catch(() => {
      Alert.alert("Couldn’t save changes", "Try again.");
    });
  }, [runsPeople, runsPeopleLoaded]);

  useEffect(() => {
    if (!schoolLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_SCHOOL, JSON.stringify(schoolHolidays)).catch(() => {
      Alert.alert("Couldn’t save changes", "Try again.");
    });
  }, [schoolHolidays, schoolLoaded]);

  // Calendar actions
  function goToToday() {
    setSelectedDate(today);
  }
  function goPrevMonth() {
    setSelectedDate((prev) => startOfDay(addMonthsClamp(prev, -1)));
  }
  function goNextMonth() {
    setSelectedDate((prev) => startOfDay(addMonthsClamp(prev, 1)));
  }
  function goPrevWeek() {
    setSelectedDate((prev) => startOfDay(addDays(prev, -7)));
  }
  function goNextWeek() {
    setSelectedDate((prev) => startOfDay(addDays(prev, 7)));
  }
  function onPressMonthMode() {
    Alert.alert("Coming soon", "Month view will be added in a later phase.");
  }
  function openCalendarDetails(item: AnyItem) {
    setSelectedItem(item);
    setDetailsOpen(true);
  }
  function closeCalendarDetails() {
    setDetailsOpen(false);
    setTimeout(() => setSelectedItem(null), 200);
  }

  const calendarModalMeta = useMemo(() => {
    if (!selectedItem) return "";
    if (selectedItem.kind === "allDay") return `${formatDayShort(selectedDate)} · All-day`;
    if (selectedItem.kind === "scheduled") {
      const end = selectedItem.endTimeLabel ? `–${selectedItem.endTimeLabel}` : "";
      const time =
        selectedItem.timeLabel && selectedItem.timeLabel !== "—"
          ? selectedItem.timeLabel
          : "Scheduled";
      return `${formatDayShort(selectedDate)} · ${time}${end}`;
    }
    return `${formatDayShort(selectedDate)} · Task (due)`;
  }, [selectedItem, selectedDate]);

  // Runs actions
  function runsPrevWeek() {
    setRunsWeekStart((prev) => startOfDay(addDays(prev, -7)));
  }
  function runsNextWeek() {
    setRunsWeekStart((prev) => startOfDay(addDays(prev, 7)));
  }
  function runsToThisWeek() {
    setRunsWeekStart(currentRunsWeekStart);
  }

  function openRunsAdd() {
    setRunsEditingId(null);
    setRunsType("pickup");
    setRunsCategory("school");
    setRunsDateISO(formatYYYYMMDD(startOfDay(runsWeekStart)));
    setRunsTimeLabel("");
    setRunsWho("");
    setRunsWhoChoice(defaultWho && defaultWho.trim() ? defaultWho : "You");
    setRunsOtherSave(false);
    setRunsNotes("");
    setRunsFormOpen(true);
  }

  function openRunsEdit(entry: RunEntry) {
    setRunsEditingId(entry.id);
    setRunsType(entry.type);
    setRunsCategory(entry.category || "school");
    setRunsDateISO(entry.dateISO);
    setRunsTimeLabel(entry.timeLabel || "");
    setRunsWho(entry.who);
    {
      const w = (entry.who || "").trim();
      const isPreset = !!w && (w.toLowerCase() === "you" || runsPeople.some((p) => p.toLowerCase() === w.toLowerCase()) || (defaultWho && defaultWho.toLowerCase() === w.toLowerCase()));
      setRunsWhoChoice(isPreset ? (w || "You") : WHO_OTHER);
    }
    setRunsOtherSave(false);
    setRunsNotes(entry.notes || "");
    setRunsFormOpen(true);
  }

  
  function openWhoPicker() {
    const options = ["You", ...runsPeople, "Other…", "Cancel"];
    const cancelButtonIndex = options.length - 1;
    const otherIndex = options.length - 2;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "Who’s doing the run?",
        },
        (buttonIndex) => {
          if (buttonIndex === cancelButtonIndex) return;
          if (buttonIndex === otherIndex) {
            setRunsWhoChoice(WHO_OTHER);
            setRunsWho("");
            setRunsOtherSave(false);
            return;
          }
          const choice = options[buttonIndex] || "You";
          setRunsWhoChoice(choice);
          setRunsWho("");
          setRunsOtherSave(false);
        }
      );
      return;
    }

    // Android fallback: keep existing modal picker (if present)
    setRunsWhoPickerOpen(true);
  }

function saveRunEntry() {
    const picked = (runsWhoChoice || "").trim();
    const who = picked === WHO_OTHER ? runsWho.trim() : picked;
    const dateISO = runsDateISO;
    if (!who) return;

    // If "Other…" and user opted to save, add to local people list (Phase 1)
    if (runsWhoChoice === WHO_OTHER && runsOtherSave) {
      const n = who.trim();
      if (n && n.toLowerCase() !== "you") {
        setRunsPeople((prev) => {
          const exists = prev.some((p) => p.toLowerCase() === n.toLowerCase());
          if (exists) return prev;
          return [...prev, n].slice(0, 20);
        });
      }
    }


    const now = Date.now();
    if (runsEditingId) {
      setRunsEntries((prev) =>
        prev.map((e) =>
          e.id === runsEditingId
            ? {
                ...e,
                type: runsType,
                category: runsCategory,
                dateISO,
                timeLabel: runsTimeLabel.trim() || undefined,
                who,
                notes: runsNotes.trim() || undefined,
                updatedAt: now,
              }
            : e
        )
      );
    } else {
      const entry: RunEntry = {
        id: genId("run"),
        type: runsType,
        category: runsCategory,
        dateISO,
        timeLabel: runsTimeLabel.trim() || undefined,
        who,
        notes: runsNotes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setRunsEntries((prev) => [entry, ...prev]);
    }
    setRunsFormOpen(false);
  }

  function confirmDeleteRun(entry: RunEntry) {
    Alert.alert("Delete entry?", "This will remove it from your schedule.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setRunsEntries((prev) => prev.filter((e) => e.id !== entry.id));
          setRunsDetailsOpen(false);
          setRunsSelectedId(null);
        },
      },
    ]);
  }

  // Holidays actions
  function holidaysPrevYear() {
    setSchoolBaseYear((y) => y - 1);
  }
  function holidaysNextYear() {
    setSchoolBaseYear((y) => y + 1);
  }
  function holidaysToThisYear() {
    setSchoolBaseYear(inferAcademicBaseYear(today));
  }

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

  const holidayDateError = useMemo(
    () => (holidayEndISO < holidayStartISO ? "End date must be after start date" : ""),
    [holidayStartISO, holidayEndISO]
  );

  function saveHoliday() {
    const name = holidayName.trim();
    if (!name) return;
    if (holidayEndISO < holidayStartISO) return;

    const now = Date.now();
    if (holidayEditingId) {
      setSchoolHolidays((prev) =>
        prev.map((h) =>
          h.id === holidayEditingId
            ? {
                ...h,
                name,
                startISO: holidayStartISO,
                endISO: holidayEndISO,
                notes: holidayNotes.trim() || undefined,
                updatedAt: now,
              }
            : h
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
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setSchoolHolidays((prev) => prev.filter((x) => x.id !== h.id));
          setHolidayDetailsOpen(false);
          setHolidaySelectedId(null);
        },
      },
    ]);
  }

  // Ensure content doesn't hide behind pinned mode bar
  const scrollBottomPadding = useMemo(() => MODE_BAR_HEIGHT + 22, []);

  // Helpers: open details
  function openRunDetails(id: string) {
    setRunsSelectedId(id);
    setRunsDetailsOpen(true);
  }
  function closeRunDetails() {
    setRunsDetailsOpen(false);
    setTimeout(() => setRunsSelectedId(null), 200);
  }
  function openHolidayDetails(id: string) {
    setHolidaySelectedId(id);
    setHolidayDetailsOpen(true);
  }
  function closeHolidayDetails() {
    setHolidayDetailsOpen(false);
    setTimeout(() => setHolidaySelectedId(null), 200);
  }

  function ModeButton({
    top,
    bottom,
    value,
  }: {
    top: string;
    bottom?: string;
    value: CalendarMode;
  }) {
    const selected = mode === value;
    return (
      <Pressable
        onPress={() => setMode(value)}
        style={({ pressed }) => [
          styles.modeBarItem,
          selected && styles.modeBarItemSelected,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[styles.modeBarText, selected && styles.modeBarTextSelected]}
          numberOfLines={2}
        >
          {bottom ? `${top}\n${bottom}` : top}
        </Text>
      </Pressable>
    );
  }

  function CalendarView() {
    return (
      <>
        <View style={styles.monthHeader}>
          <Pressable
            onPress={goPrevMonth}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Text style={styles.iconBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <Pressable
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
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          <Pressable
            onPress={goPrevWeek}
            style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}
          >
            <Text style={styles.weekNavText}>‹</Text>
          </Pressable>

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

          <Pressable
            onPress={goNextWeek}
            style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}
          >
            <Text style={styles.weekNavText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.daySheet}>
          <View style={styles.daySheetHeader}>
            <Text style={styles.dayTitle}>{formatDayTitle(selectedDate)}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{calendarItemCount} items</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All-day</Text>
            {calendarAllDayItems.length === 0 ? (
              <Text style={styles.emptyText}>No all-day items</Text>
            ) : (
              calendarAllDayItems.map((it) => (
                <Pressable
                  key={it.id}
                  onPress={() => openCalendarDetails(it)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scheduled</Text>
            {calendarScheduledItems.length === 0 ? (
              <Text style={styles.emptyText}>Nothing scheduled</Text>
            ) : (
              calendarScheduledItems.map((it) => (
                <Pressable
                  key={it.id}
                  onPress={() => openCalendarDetails(it)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            {calendarTaskItems.length === 0 ? (
              <Text style={styles.emptyText}>No tasks due</Text>
            ) : (
              calendarTaskItems.map((it) => (
                <Pressable
                  key={it.id}
                  onPress={() => openCalendarDetails(it)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
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
      </>
    );
  }

  function RunsView() {
    return (
      <>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>School runs</Text>
          </View>

          <Pressable
            onPress={openRunsAdd}
            style={({ pressed }) => [styles.smallPrimaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.smallPrimaryBtnText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.runsNavRow}>
          <Pressable
            onPress={runsPrevWeek}
            style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}
          >
            <Text style={styles.weekNavText}>‹</Text>
          </Pressable>

          <View style={styles.centerNavLabel}>
            <Text style={styles.centerNavLabelText}>{runsCenterLabel}</Text>
          </View>

          <Pressable
            onPress={runsNextWeek}
            style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}
          >
            <Text style={styles.weekNavText}>›</Text>
          </Pressable>

          <Pressable
            onPress={runsToThisWeek}
            style={({ pressed }) => [styles.thisBtn, pressed && styles.pressed]}
          >
            <Text style={styles.thisBtnText}>This week</Text>
          </Pressable>
        </View>

        {runsWeekDays.map((d) => {
          const iso = formatYYYYMMDD(d);
          const byType = runsEntriesByDay[iso] || { pickup: [], dropoff: [] };
          const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(d);

          const hasAny = byType.pickup.length + byType.dropoff.length > 0;

          return (
            <View key={iso} style={styles.runsCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{dayLabel}</Text>
                <Text style={styles.cardMeta}>{formatDisplayDMY(d)}</Text>
              </View>

              {!hasAny ? (
                <Text style={styles.cardEmptyCompact}>No runs</Text>
              ) : (
                <>
                  <View style={styles.cardSection}>
                    <Text style={styles.cardSectionTitle}>Pickup</Text>
                    {byType.pickup.length === 0 ? (
                      <Text style={styles.cardEmpty}>—</Text>
                    ) : (
                      byType.pickup.map((e) => (
                        <Pressable
                          key={e.id}
                          onPress={() => openRunDetails(e.id)}
                          style={({ pressed }) => [styles.rowCompact, pressed && styles.pressed]}
                        >
                          <Text style={styles.timeLabel}>{safeLabel(e.timeLabel, "—")}</Text>
                          <View style={styles.rowMain}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {`${e.who} · ${categoryLabel(e.category)}`}
                            </Text>
                          </View>
                        </Pressable>
                      ))
                    )}
                  </View>

                  <View style={styles.sectionDividerThin} />

                  <View style={styles.cardSection}>
                    <Text style={styles.cardSectionTitle}>Drop-off</Text>
                    {byType.dropoff.length === 0 ? (
                      <Text style={styles.cardEmpty}>—</Text>
                    ) : (
                      byType.dropoff.map((e) => (
                        <Pressable
                          key={e.id}
                          onPress={() => openRunDetails(e.id)}
                          style={({ pressed }) => [styles.rowCompact, pressed && styles.pressed]}
                        >
                          <Text style={styles.timeLabel}>{safeLabel(e.timeLabel, "—")}</Text>
                          <View style={styles.rowMain}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {`${e.who} · ${categoryLabel(e.category)}`}
                            </Text>
                          </View>
                        </Pressable>
                      ))
                    )}
                  </View>
                </>
              )}
            </View>
          );
        })}
      </>
    );
  }


  useEffect(() => {
    if (!runsFormOpen) return;
    // Ensure picker has a default selection
    if (!runsWhoChoice) {
      setRunsWhoChoice(defaultWho && defaultWho.trim() ? defaultWho : "You");
    }
  }, [runsFormOpen]);

  function HolidaysView() {
    return (
      <>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>School holidays</Text>
            <Text style={styles.pageSub}>Academic year</Text>
          </View>

          <Pressable
            onPress={openHolidayAdd}
            style={({ pressed }) => [styles.smallPrimaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.smallPrimaryBtnText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.runsNavRow}>
          <Pressable
            onPress={holidaysPrevYear}
            style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}
          >
            <Text style={styles.weekNavText}>‹</Text>
          </Pressable>

          <View style={styles.centerNavLabel}>
            <Text style={styles.centerNavLabelText}>{schoolYearLabel}</Text>
          </View>

          <Pressable
            onPress={holidaysNextYear}
            style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}
          >
            <Text style={styles.weekNavText}>›</Text>
          </Pressable>

          <Pressable
            onPress={holidaysToThisYear}
            style={({ pressed }) => [styles.thisBtn, pressed && styles.pressed]}
          >
            <Text style={styles.thisBtnText}>This year</Text>
          </Pressable>
        </View>

        {schoolFiltered.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardEmpty}>No holidays added yet</Text>
          </View>
        ) : (
          schoolFiltered.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => openHolidayDetails(h.id)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{h.name}</Text>
                <Text style={styles.cardMeta}>
                  {formatDisplayFromYYYYMMDD(h.startISO)} – {formatDisplayFromYYYYMMDD(h.endISO)}
                </Text>
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
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: scrollBottomPadding }]}
        >
          {mode === "calendar" ? <CalendarView /> : null}
          {mode === "runs" ? <RunsView /> : null}
          {mode === "holidays" ? <HolidaysView /> : null}
        </ScrollView>

        <View style={styles.modeBarOuter}>
          <View style={styles.modeBarInner}>
            <ModeButton top="Calendar" value="calendar" />
            <ModeButton top="School" bottom="runs" value="runs" />
            <ModeButton top="School" bottom="holidays" value="holidays" />
          </View>
        </View>

        {/* Calendar details modal */}
        <Modal
          visible={detailsOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeCalendarDetails}
        >
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={closeCalendarDetails}
                style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
              >
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

              <Text style={styles.modalFootnote}>
                Phase 1 scaffold — editing and imports will be added later.
              </Text>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Runs form modal */}
        <Modal
          visible={runsFormOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setRunsFormOpen(false)}
        >
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setRunsFormOpen(false)}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              >
                <Text style={styles.headerBtnText}>Cancel</Text>
              </Pressable>
              <Text style={styles.headerTitle}>
                {runsEditingId ? "Edit run" : "Add run"}
              </Text>
              <Pressable
                onPress={saveRunEntry}
                disabled={!((runsWhoChoice && runsWhoChoice !== WHO_OTHER) || (runsWhoChoice === WHO_OTHER && runsWho.trim()))}
                style={({ pressed }) => [
                  styles.headerBtn,
                  (!((runsWhoChoice && runsWhoChoice !== WHO_OTHER) || (runsWhoChoice === WHO_OTHER && runsWho.trim()))) && styles.disabledBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.headerBtnText,
                    (!((runsWhoChoice && runsWhoChoice !== WHO_OTHER) || (runsWhoChoice === WHO_OTHER && runsWho.trim()))) && styles.disabledBtnText,
                  ]}
                >
                  Save
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.segment}>
                  <Pressable
                    onPress={() => setRunsType("pickup")}
                    style={({ pressed }) => [
                      styles.segmentItem,
                      runsType === "pickup" && styles.segmentItemSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        runsType === "pickup" && styles.segmentTextSelected,
                      ]}
                    >
                      Pickup
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRunsType("dropoff")}
                    style={({ pressed }) => [
                      styles.segmentItem,
                      runsType === "dropoff" && styles.segmentItemSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        runsType === "dropoff" && styles.segmentTextSelected,
                      ]}
                    >
                      Drop-off
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Category</Text>
                <View style={styles.segment}>
                  <Pressable
                    onPress={() => setRunsCategory("school")}
                    style={({ pressed }) => [
                      styles.segmentItem,
                      runsCategory === "school" && styles.segmentItemSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        runsCategory === "school" && styles.segmentTextSelected,
                      ]}
                    >
                      School
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRunsCategory("clubs")}
                    style={({ pressed }) => [
                      styles.segmentItem,
                      runsCategory === "clubs" && styles.segmentItemSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        runsCategory === "clubs" && styles.segmentTextSelected,
                      ]}
                    >
                      Clubs
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRunsCategory("other")}
                    style={({ pressed }) => [
                      styles.segmentItem,
                      runsCategory === "other" && styles.segmentItemSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        runsCategory === "other" && styles.segmentTextSelected,
                      ]}
                    >
                      Other
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Date</Text>
                <Pressable
                  onPress={() => setRunsDatePickerOpen(true)}
                  style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
                >
                  <Text style={styles.inputLikeText}>
                    {formatDisplayFromYYYYMMDD(runsDateISO)}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Time (optional)</Text>
                <TextInput
                  value={runsTimeLabel}
                  onChangeText={setRunsTimeLabel}
                  placeholder="15:20"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Who’s doing the run?</Text>

                <Pressable
                  onPress={openWhoPicker}
                  style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
                >
                  <Text style={styles.inputLikeText}>
                    {runsWhoChoice === WHO_OTHER
                      ? (runsWho.trim() ? runsWho.trim() : "Other…")
                      : safeLabel(runsWhoChoice, "You")}
                  </Text>
                </Pressable>

                {runsWhoChoice === WHO_OTHER ? (
                  <View style={{ marginTop: 10 }}>
                    <TextInput
                      value={runsWho}
                      onChangeText={setRunsWho}
                      placeholder="Name"
                      placeholderTextColor="#9CA3AF"
                      style={styles.textInput}
                    />

                    <View style={styles.saveRow}>
                      <Text style={styles.saveRowText}>
                        Save this person for future use
                      </Text>
                      <Switch value={runsOtherSave} onValueChange={setRunsOtherSave} />
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Notes (optional)</Text>
                <TextInput
                  value={runsNotes}
                  onChangeText={setRunsNotes}
                  placeholder="Optional"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.textInput, { height: 90 }]}
                  multiline
                />
              </View>

              <Text style={styles.modalFootnote}>
                Dates use the canonical picker. Time is free text in Phase 1.
              </Text>
            </ScrollView>

            <DatePickerModal
              visible={runsDatePickerOpen}
              title="Select date"
              initialDate={parseYYYYMMDD(runsDateISO) || today}
              onCancel={() => setRunsDatePickerOpen(false)}
              onConfirm={(d) => {
                setRunsDatePickerOpen(false);
                setRunsDateISO(formatYYYYMMDD(startOfDay(d)));
              }}
            />
          </SafeAreaView>
        </Modal>

        {/* Runs details modal */}
        <Modal
          visible={runsDetailsOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeRunDetails}
        >
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={closeRunDetails}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              >
                <Text style={styles.headerBtnText}>Done</Text>
              </Pressable>
              <Text style={styles.headerTitle}>Run</Text>
              <View style={{ width: 56 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {runsSelected ? (
                <>
                  <Text style={styles.modalTitle}>
                    {categoryLabel(runsSelected.category)} ·{" "}
                    {runsSelected.type === "pickup" ? "Pickup" : "Drop-off"} ·{" "}
                    {runsSelected.who}
                  </Text>
                  <Text style={styles.modalMeta}>
                    {formatDisplayFromYYYYMMDD(runsSelected.dateISO)} ·{" "}
                    {safeLabel(runsSelected.timeLabel, "—")}
                  </Text>

                  {!!runsSelected.notes && (
                    <View style={styles.detailCard}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>{runsSelected.notes}</Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => {
                        setRunsDetailsOpen(false);
                        openRunsEdit(runsSelected);
                      }}
                      style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.secondaryBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDeleteRun(runsSelected)}
                      style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
                    >
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
        <Modal
          visible={holidayFormOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setHolidayFormOpen(false)}
        >
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setHolidayFormOpen(false)}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              >
                <Text style={styles.headerBtnText}>Cancel</Text>
              </Pressable>
              <Text style={styles.headerTitle}>
                {holidayEditingId ? "Edit holiday" : "Add holiday"}
              </Text>
              <Pressable
                onPress={saveHoliday}
                disabled={!holidayName.trim() || !!holidayDateError}
                style={({ pressed }) => [
                  styles.headerBtn,
                  (!holidayName.trim() || !!holidayDateError) && styles.disabledBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.headerBtnText,
                    (!holidayName.trim() || !!holidayDateError) && styles.disabledBtnText,
                  ]}
                >
                  Save
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  value={holidayName}
                  onChangeText={setHolidayName}
                  placeholder="e.g. Christmas break"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Start date</Text>
                <Pressable
                  onPress={() => setHolidayStartPickerOpen(true)}
                  style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
                >
                  <Text style={styles.inputLikeText}>
                    {formatDisplayFromYYYYMMDD(holidayStartISO)}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>End date</Text>
                <Pressable
                  onPress={() => setHolidayEndPickerOpen(true)}
                  style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
                >
                  <Text style={styles.inputLikeText}>
                    {formatDisplayFromYYYYMMDD(holidayEndISO)}
                  </Text>
                </Pressable>
              </View>

              {!!holidayDateError && <Text style={styles.errorText}>{holidayDateError}</Text>}

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Notes (optional)</Text>
                <TextInput
                  value={holidayNotes}
                  onChangeText={setHolidayNotes}
                  placeholder="Optional"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.textInput, { height: 90 }]}
                  multiline
                />
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
              onConfirm={(d) => {
                setHolidayEndPickerOpen(false);
                setHolidayEndISO(formatYYYYMMDD(startOfDay(d)));
              }}
            />
          </SafeAreaView>
        </Modal>

        {/* Holiday details modal */}
        <Modal
          visible={holidayDetailsOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeHolidayDetails}
        >
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={closeHolidayDetails}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              >
                <Text style={styles.headerBtnText}>Done</Text>
              </Pressable>
              <Text style={styles.headerTitle}>Holiday</Text>
              <View style={{ width: 56 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {holidaySelected ? (
                <>
                  <Text style={styles.modalTitle}>{holidaySelected.name}</Text>
                  <Text style={styles.modalMeta}>
                    {formatDisplayFromYYYYMMDD(holidaySelected.startISO)} –{" "}
                    {formatDisplayFromYYYYMMDD(holidaySelected.endISO)}
                  </Text>

                  {!!holidaySelected.notes && (
                    <View style={styles.detailCard}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>{holidaySelected.notes}</Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => {
                        setHolidayDetailsOpen(false);
                        openHolidayEdit(holidaySelected);
                      }}
                      style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.secondaryBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDeleteHoliday(holidaySelected)}
                      style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
                    >
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

  modeBarOuter: {
    height: MODE_BAR_HEIGHT,
    paddingHorizontal: 16,
    paddingBottom: 6,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
  },
  modeBarInner: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#F4F4F6",
    flexDirection: "row",
    overflow: "hidden",
  },
  modeBarItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  modeBarItemSelected: { backgroundColor: "#121214" },
  modeBarText: { fontSize: 13, fontWeight: "900", color: "#5F5F66", textAlign: "center", lineHeight: 15 },
  modeBarTextSelected: { color: "#FFFFFF" },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthTitle: { fontSize: 22, fontWeight: "700", letterSpacing: 0.2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F6",
  },
  iconBtnText: { fontSize: 28, lineHeight: 28, fontWeight: "600" },

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
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  modeItemSelected: { backgroundColor: "#FFFFFF" },
  modeDivider: { width: 1, height: 18, backgroundColor: "#D9D9DE" },
  modeText: { fontSize: 14, fontWeight: "700" },
  modeTextMuted: { fontSize: 14, fontWeight: "700", color: "#5F5F66" },
  modeSubtle: { fontSize: 12, color: "#7A7A83", fontWeight: "600" },

  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F4F4F6",
  },
  todayBtnText: { fontSize: 14, fontWeight: "700" },

  weekRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  weekNavBtn: {
    width: 34,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F6",
  },
  weekNavText: { fontSize: 22, lineHeight: 22, fontWeight: "800", color: "#121214" },

  weekStrip: { flex: 1, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  dayCell: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F7F9",
  },
  dayCellSelected: { backgroundColor: "#121214" },
  dayDow: { fontSize: 12, color: "#5F5F66", fontWeight: "700" },
  dayNum: { fontSize: 16, fontWeight: "800", marginTop: 2, color: "#121214" },
  dayTextSelected: { color: "#FFFFFF" },
  todayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, backgroundColor: "#121214" },
  todayDotSelected: { backgroundColor: "#FFFFFF" },
  todayDotPlaceholder: { width: 6, height: 6, borderRadius: 3, marginTop: 6, backgroundColor: "transparent" },

  daySheet: { borderRadius: 18, backgroundColor: "#F7F7F9", padding: 16 },
  daySheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  dayTitle: { fontSize: 18, fontWeight: "800", flex: 1 },
  countPill: { backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  countPillText: { fontSize: 13, fontWeight: "800", color: "#5F5F66" },

  section: { marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#5F5F66", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#7A7A83", lineHeight: 20, paddingBottom: 4 },
  sectionDivider: { height: 1, backgroundColor: "#E2E2E8", marginVertical: 14 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  rowCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    marginBottom: 6,
  },
  sourceBar: { width: 4, height: 32, borderRadius: 2, backgroundColor: "#D9D9DE" },
  timeLabel: { width: 54, fontSize: 13, fontWeight: "800", color: "#5F5F66" },
  taskDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#D9D9DE" },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "800", color: "#121214" },
  rowSub: { marginTop: 2, fontSize: 13, color: "#7A7A83" },

  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  pageTitle: { fontSize: 22, fontWeight: "900", color: "#121214" },
  pageSub: { marginTop: 6, fontSize: 14, fontWeight: "700", color: "#7A7A83" },

  runsNavRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  centerNavLabel: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerNavLabelText: { fontSize: 13, fontWeight: "900", color: "#5F5F66" },
  thisBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: "#F4F4F6" },
  thisBtnText: { fontSize: 13, fontWeight: "900", color: "#121214" },

  card: { marginTop: 12, borderRadius: 18, backgroundColor: "#F7F7F9", padding: 14 },
  cardHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: "900", color: "#121214", flex: 1 },
  cardMeta: { fontSize: 12, fontWeight: "800", color: "#7A7A83" },
  cardNotes: { marginTop: 8, fontSize: 13, fontWeight: "700", color: "#5F5F66", lineHeight: 18 },
  cardSection: { marginTop: 2 },
  cardSectionTitle: { fontSize: 12, fontWeight: "900", color: "#5F5F66", marginBottom: 6 },
  cardEmpty: { marginTop: 4, fontSize: 14, fontWeight: "700", color: "#7A7A83" },

  runsCard: { marginTop: 10, borderRadius: 18, backgroundColor: "#F7F7F9", padding: 12 },
  cardEmptyCompact: { marginTop: 2, fontSize: 14, fontWeight: "800", color: "#7A7A83" },
  sectionDividerThin: { height: 1, backgroundColor: "#E2E2E8", marginVertical: 10 },

  smallPrimaryBtn: { borderRadius: 14, backgroundColor: "#121214", paddingVertical: 6, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
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
