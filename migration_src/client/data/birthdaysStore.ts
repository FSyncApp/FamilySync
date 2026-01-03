import * as React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Birthday = {
  id: string;
  name: string;
  relationship?: string;
  /**
   * Canonical storage: YYYY-MM-DD (DOB).
   * Display formatting happens elsewhere.
   */
  dateYYYYMMDD: string;
};

type Listener = () => void;

const STORAGE_KEY = "familysync_birthdays_v1";

const DEFAULT_BIRTHDAYS: Birthday[] = [
  { id: "b1", name: "Emma", relationship: "Daughter", dateYYYYMMDD: "2021-12-30" },
  { id: "b2", name: "Nana", relationship: "Grandmother", dateYYYYMMDD: "1952-01-14" },
  { id: "b3", name: "Mark", relationship: "Dad", dateYYYYMMDD: "1989-06-07" },
];

let birthdays: Birthday[] = DEFAULT_BIRTHDAYS;

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // noop
    }
  });
}

function isBirthdayLike(x: any): x is Birthday {
  return (
    x &&
    typeof x === "object" &&
    typeof x.id === "string" &&
    typeof x.name === "string" &&
    typeof x.dateYYYYMMDD === "string" &&
    (x.relationship === undefined || typeof x.relationship === "string")
  );
}

async function persistBirthdays(next: Birthday[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore persistence failures (demo mode)
  }
}

async function hydrateOnce() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const cleaned = parsed.filter(isBirthdayLike) as Birthday[];
    if (!cleaned.length) return;

    birthdays = cleaned;
    emit();
  } catch {
    // ignore; keep defaults
  }
}

// Fire-and-forget hydration. Safe in React Native environment.
hydrateOnce();

/**
 * Canonical subscription API.
 * (Some older screens may call subscribeBirthdays(); we keep a compatibility alias below.)
 */
export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Compatibility alias (older patches/screens) */
export function subscribeBirthdays(listener: Listener) {
  return subscribe(listener);
}

export function getBirthdays(): Birthday[] {
  return birthdays;
}

/** Compatibility alias (older patches/screens) */
export function getBirthdaysList(): Birthday[] {
  return getBirthdays();
}

export function setBirthdays(next: Birthday[]) {
  birthdays = next;
  emit();
  persistBirthdays(birthdays);
}

/** Update by id if it exists, otherwise insert. */
export function upsertBirthday(b: Birthday) {
  const idx = birthdays.findIndex((x) => x.id === b.id);
  if (idx >= 0) {
    birthdays = [...birthdays.slice(0, idx), b, ...birthdays.slice(idx + 1)];
  } else {
    birthdays = [b, ...birthdays];
  }
  emit();
  persistBirthdays(birthdays);
}

export function removeBirthday(id: string) {
  const next = birthdays.filter((b) => b.id !== id);
  if (next.length !== birthdays.length) {
    birthdays = next;
    emit();
    persistBirthdays(birthdays);
  }
}

function parseYYYYMMDD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
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

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function getUpcomingBirthdays(withinDays: number, list: Birthday[] = birthdays) {
  const today = startOfDay(new Date());

  const enriched = list
    .map((b) => {
      const dob = parseYYYYMMDD(b.dateYYYYMMDD);
      if (!dob) return null;
      const next = nextOccurrence(today, dob.getMonth(), dob.getDate());
      const days = daysBetween(today, next);
      return { b, next, days };
    })
    .filter(Boolean) as Array<{ b: Birthday; next: Date; days: number }>;

  return enriched
    .filter((x) => x.days >= 0 && x.days <= withinDays)
    .sort((a, b) => a.days - b.days);
}

function labelFor(name: string, days: number) {
  if (days === 0) return `${name}'s birthday today`;
  if (days === 1) return `${name}'s birthday tomorrow`;
  return `${name}'s birthday in ${days} days`;
}

export function useBirthdays(): Birthday[] {
  return React.useSyncExternalStore(subscribe, getBirthdays, getBirthdays);
}

/**
 * Home ticker label.
 * - Hides itself if there are no birthdays within `withinDays` (default 60).
 * - If there are 2+ birthdays within `rotateWindowDays` (default 14),
 *   it cycles through them every `rotateEveryMs` (default 3500ms).
 */
export function useBirthdayTickerLabel(opts?: {
  withinDays?: number;
  rotateWindowDays?: number;
  rotateEveryMs?: number;
}): { visible: boolean; label: string } {
  const withinDays = opts?.withinDays ?? 60;
  const rotateWindowDays = opts?.rotateWindowDays ?? 14;
  const rotateEveryMs = opts?.rotateEveryMs ?? 3500;

  const list = useBirthdays();

  const candidates = React.useMemo(() => {
    const upcoming = getUpcomingBirthdays(withinDays, list);
    return upcoming.map((x) => ({
      id: x.b.id,
      label: labelFor(x.b.name, x.days),
      days: x.days,
    }));
  }, [list, withinDays]);

  const rotatable = React.useMemo(
    () => candidates.filter((c) => c.days <= rotateWindowDays),
    [candidates, rotateWindowDays]
  );

  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    setIdx(0);
  }, [rotatable.length]);

  React.useEffect(() => {
    if (rotatable.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % rotatable.length);
    }, rotateEveryMs);
    return () => clearInterval(t);
  }, [rotatable.length, rotateEveryMs]);

  if (!candidates.length) return { visible: false, label: "" };

  if (rotatable.length >= 2) {
    return { visible: true, label: rotatable[idx]?.label ?? candidates[0].label };
  }
  return { visible: true, label: candidates[0].label };
}
