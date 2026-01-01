/** FS PATCH: Tasks store v1 (mirrors billsStore pattern) */
import { supabase } from "../lib/supabase";

export type TaskRow = {
  id: string;
  family_id: string;
  title: string;
  notes?: string | null;
  due_date?: string | null; // YYYY-MM-DD
  assigned_to?: string | null;
  completed?: boolean | null;
  calendar_sync_requested?: boolean | null;
  reminder_enabled?: boolean | null;
  reminder_days_before?: number | null;
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

export async function listTasks(): Promise<TaskRow[]> {
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("family_id", familyId)
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
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

  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.due_date !== undefined) payload.due_date = input.due_date;
  if (input.assigned_to !== undefined) payload.assigned_to = input.assigned_to;
  if (input.completed !== undefined) payload.completed = Boolean(input.completed);
  if (input.calendar_sync_requested !== undefined)
    payload.calendar_sync_requested = Boolean(input.calendar_sync_requested);

  if (input.reminder_enabled !== undefined) payload.reminder_enabled = Boolean(input.reminder_enabled);
  if (input.reminder_days_before !== undefined) payload.reminder_days_before = input.reminder_days_before;

  const { data, error } = await supabase
    .from("tasks")
    .upsert(payload)
    .select("*")
    .single();

  if (error) throw error;
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
