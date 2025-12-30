/** Bills store (Phase 2) */
import { supabase } from "../lib/supabase";

export type BillRow = {
  id: string;
  family_id: string;
  user_id?: string | null;
  name: string;
  amount: number;
  // Optional columns that may exist in DB
  frequency?: string | null;
  auto_renew?: boolean | null;
  notes?: string | null;
  created_at?: string;
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
    .select("id,family_id,user_id,name,amount,frequency,auto_renew,notes,created_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as BillRow[];
}

export async function getBillById(id: string): Promise<BillRow | null> {
  const familyId = getDefaultFamilyId();
  const { data, error } = await supabase
    .from("bills")
    .select("id,family_id,user_id,name,amount,frequency,auto_renew,notes,created_at")
    .eq("id", id)
    .eq("family_id", familyId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as BillRow | null;
}

export type UpsertBillInput = {
  id?: string;
  name: string;
  amount?: number | null;
  amount_pence?: number | null; // allow older callers
  frequency?: string | null;
  auto_renew?: boolean | null;
  notes?: string | null;
};

export async function upsertBill(input: UpsertBillInput): Promise<BillRow> {
  const familyId = getDefaultFamilyId();

  const name = input.name?.trim();
  if (!name) throw new Error("Bill name is required");

  let amount: number | null = typeof input.amount === "number" ? input.amount : null;
  if (amount === null && typeof input.amount_pence === "number") amount = input.amount_pence / 100;
  if (typeof amount !== "number" || Number.isNaN(amount)) throw new Error("Amount is required");

  // Build payload carefully: avoid sending null for NOT NULL columns.
  const payload: any = {
    ...(input.id ? { id: input.id } : {}),
    family_id: familyId,
    name,
    amount,
  };

  if (input.frequency !== undefined) payload.frequency = input.frequency;
  if (input.notes !== undefined) payload.notes = input.notes;

  // auto_renew is commonly NOT NULL in DB. Never send null; default to false.
  if (input.auto_renew !== undefined) {
    payload.auto_renew = Boolean(input.auto_renew);
  } else {
    payload.auto_renew = false;
  }

  const { data, error } = await supabase.from("bills").upsert(payload).select("*").single();
  if (error) throw error;
  return data as BillRow;
}

export async function deleteBill(id: string): Promise<void> {
  const familyId = getDefaultFamilyId();
  const { error } = await supabase.from("bills").delete().eq("id", id).eq("family_id", familyId);
  if (error) throw error;
}
