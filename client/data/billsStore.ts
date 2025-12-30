import { supabase } from "../lib/supabase";

export type BillFrequency = "monthly" | "weekly" | "yearly" | "one_off";

export type BillRow = {
  id: string;
  name: string;

  // current app model
  amount_pence: number | null;
  currency: string;

  is_recurring: boolean;
  frequency: BillFrequency;
  next_due_date: string | null; // YYYY-MM-DD
  category: string | null;
  provider: string | null;
  notes: string | null;

  // timestamps
  created_at: string;
  updated_at: string;

  // legacy schema compatibility (may exist on remote)
  amount?: number | null;
};

export async function listBills(): Promise<BillRow[]> {
  const { data, error } = await supabase.from("bills").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BillRow[];
}

export async function getBill(id: string): Promise<BillRow | null> {
  const { data, error } = await supabase.from("bills").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as BillRow | null;
}

export async function upsertBill(input: {
  id?: string;
  name: string;
  amount_pence?: number | null;
  currency?: string;
  is_recurring: boolean;
  frequency: BillFrequency;
  next_due_date?: string | null;
  category?: string | null;
  provider?: string | null;
  notes?: string | null;
}): Promise<BillRow> {
  const amountPence = input.amount_pence ?? null;

  // Legacy compatibility:
  // Some existing schemas use a NOT NULL numeric "amount".
  // If blank, set to 0 to satisfy NOT NULL. (We can refine later.)
  const legacyAmount = typeof amountPence === "number" ? amountPence / 100 : 0;

  const payload: any = {
    id: input.id,
    name: input.name,

    // Newer schema fields
    amount_pence: amountPence,
    currency: input.currency ?? "GBP",

    is_recurring: input.is_recurring,
    frequency: input.frequency,
    next_due_date: input.next_due_date ?? null,
    category: input.category ?? null,
    provider: input.provider ?? null,
    notes: input.notes ?? null,

    // Legacy field
    amount: legacyAmount,
  };

  const { data, error } = await supabase.from("bills").upsert(payload).select("*").single();
  if (error) throw error;
  return data as BillRow;
}
