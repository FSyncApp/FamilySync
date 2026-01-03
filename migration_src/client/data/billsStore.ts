/** FS PATCH MARKER: Bills store restore (list + getById + upsert + delete) */
import { supabase } from "../lib/supabase";

export type BillRow = {
  id: string;
  family_id: string;
  name: string;
  amount: number;
  created_at?: string;

  // Optional Phase 2 fields (safe if present)
  provider?: string | null;
  category?: string | null;
  notes?: string | null;
  auto_renew?: boolean | null;
  frequency?: string | null;
  expiry_date?: string | null;
  renewal_date?: string | null;

  // Reminders (Phase 2)
  reminder_enabled?: boolean | null;
  reminder_days_before?: number | null;
};

function getDefaultFamilyId(): string {
  const v = process.env.EXPO_PUBLIC_DEFAULT_FAMILY_ID;
  if (!v) throw new Error("Missing EXPO_PUBLIC_DEFAULT_FAMILY_ID");
  return v;
}

export async function listBills(): Promise<BillRow[]> {
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as BillRow[];
}

export async function getBillById(id: string): Promise<BillRow | null> {
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("family_id", familyId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as BillRow | null;
}

export type UpsertBillInput = {
  id?: string;
  name: string;

  amount?: number | null;
  amount_pence?: number | null;

  provider?: string | null;
  category?: string | null;
  notes?: string | null;

  auto_renew?: boolean | null;
  frequency?: string | null;

  expiry_date?: string | null;
  renewal_date?: string | null;

  // Reminders (Phase 2)
  reminder_enabled?: boolean | null;
  reminder_days_before?: number | null;
};

export async function upsertBill(input: UpsertBillInput): Promise<BillRow> {
  const familyId = getDefaultFamilyId();

  const name = input.name?.trim();
  if (!name) throw new Error("Bill name is required");

  let amount: number | null | undefined = input.amount;
  if ((amount === undefined || amount === null) && typeof input.amount_pence === "number") {
    amount = input.amount_pence / 100;
  }

  const payload: any = {
    id: input.id,
    family_id: familyId,
    name,
    auto_renew: input.auto_renew ?? false, // never null
  };

  if (typeof amount === "number") payload.amount = amount;

  if (input.provider !== undefined) payload.provider = input.provider;
  if (input.category !== undefined) payload.category = input.category;
  if (input.notes !== undefined) payload.notes = input.notes;

  if (input.frequency !== undefined) payload.frequency = input.frequency;
  if (input.expiry_date !== undefined) payload.expiry_date = input.expiry_date;
  if (input.renewal_date !== undefined) payload.renewal_date = input.renewal_date;

  if (input.reminder_enabled !== undefined) payload.reminder_enabled = input.reminder_enabled;
  if (input.reminder_days_before !== undefined) payload.reminder_days_before = input.reminder_days_before;

  const { data, error } = await supabase
    .from("bills")
    .upsert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as BillRow;
}

export async function deleteBill(id: string): Promise<void> {
  const familyId = getDefaultFamilyId();

  const { error } = await supabase
    .from("bills")
    .delete()
    .eq("family_id", familyId)
    .eq("id", id);

  if (error) throw error;
}
