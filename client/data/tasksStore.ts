/** FS PATCH: Tasks store v1.2 — add user_id fallback + reminders fields (mirrors billsStore pattern) */
import { supabase } from "../lib/supabase";

export type TaskRow = {
  id: string;
  family_id: string;

  // Some projects include user ownership on tasks. We support it safely.
  user_id?: string;

  title: string;
  notes?: string | null;

  // YYYY-MM-DD
  due_date?: string | null;

  assigned_to?: string | null; // null | "__ALL__" | free text name
  completed?: boolean | null;

  // Phase 2 intent-only flags
  calendar_sync_requested?: boolean | null;

  // Reminders (Phase 2 intent-only)
  reminder_enabled?: boolean | null;
  reminder_days_before?: number | null;

  created_at?: string;
  updated_at?: string;
};

function getDefaultFamilyId(): string {
  const v = process.env.EXPO_PUBLIC_DEFAULT_FAMILY_ID;
  if (!v) throw new Error("Missing EXPO_PUBLIC_DEFAULT_FAMILY_ID");
  return v;
}

/**
 * Some deployments enforce tasks.user_id NOT NULL.
 * We try (in order):
 * 1) EXPO_PUBLIC_DEFAULT_USER_ID (dev/bypass-friendly)
 * 2) supabase.auth.getUser() (if auth is enabled)
 */
async function resolveUserId(): Promise<string | null> {
  const env = process.env.EXPO_PUBLIC_DEFAULT_USER_ID;
  if (env && String(env).trim()) return String(env).trim();

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    const id = data?.user?.id;
    return id ?? null;
  } catch {
    return null;
  }
}

export async function listTasks(): Promise<TaskRow[]> {
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

export async function getTaskById(id: string): Promise<TaskRow | null> {
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("family_id", familyId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as TaskRow | null;
}

export type UpsertTaskInput = {
  id?: string;

  title: string;
  notes?: string | null;

  due_date?: string | null;
  assigned_to?: string | null;
  completed?: boolean | null;

  calendar_sync_requested?: boolean | null;

  reminder_enabled?: boolean | null;
  reminder_days_before?: number | null;
};

export async function upsertTask(input: UpsertTaskInput): Promise<TaskRow> {
  const familyId = getDefaultFamilyId();

  const title = input.title?.trim();
  if (!title) throw new Error("Task title is required");

  const payload: any = {
    id: input.id,
    family_id: familyId,
    title,
  };

  // Optional fields (only set if explicitly provided)
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.due_date !== undefined) payload.due_date = input.due_date;
  if (input.assigned_to !== undefined) payload.assigned_to = input.assigned_to;
  if (input.completed !== undefined) payload.completed = input.completed;

  if (input.calendar_sync_requested !== undefined) payload.calendar_sync_requested = input.calendar_sync_requested;

  if (input.reminder_enabled !== undefined) payload.reminder_enabled = input.reminder_enabled;
  if (input.reminder_days_before !== undefined) payload.reminder_days_before = input.reminder_days_before;

  // user_id handling (only if the table requires it — harmless otherwise)
  const userId = await resolveUserId();
  if (userId) payload.user_id = userId;

  const { data, error } = await supabase
    .from("tasks")
    .upsert(payload)
    .select("*")
    .single();

  if (error) {
    // Provide a clearer hint if a NOT NULL user_id constraint is present.
    const msg = (error as any)?.message ?? "";
    if (String(msg).includes("user_id") && String(msg).includes("null value")) {
      throw new Error(
        "Tasks requires a user id. If you are not using Supabase auth in dev, make tasks.user_id nullable (migration in this patch), or set EXPO_PUBLIC_DEFAULT_USER_ID."
      );
    }
    throw error;
  }

  return data as TaskRow;
}

export async function deleteTask(id: string): Promise<void> {
  const familyId = getDefaultFamilyId();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("family_id", familyId)
    .eq("id", id);

  if (error) throw error;
}
