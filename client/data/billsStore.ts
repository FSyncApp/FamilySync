import { supabase } from "../lib/supabase";

export type BillRow = {
  id: string;
  family_id: string;
  name: string;
  amount: number;
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
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as BillRow[];
}

export type UpsertBillInput = {
  id?: string;
  name: string;
  amount?: number | null;
  amount_pence?: number | null; // allow older UI
};

export async function upsertBill(input: UpsertBillInput): Promise<BillRow> {
  const familyId = getDefaultFamilyId();

  const name = input.name?.trim();
  if (!name) throw new Error("Bill name is required");

  let amount: number | null = typeof input.amount === "number" ? input.amount : null;
  if (amount === null && typeof input.amount_pence === "number") amount = input.amount_pence / 100;

  if (typeof amount !== "number" || Number.isNaN(amount)) {
    throw new Error("Amount is required");
  }

  // IMPORTANT: Only send columns that exist in the current remote schema.
  // We know these exist because the FK+NOT NULL errors referenced them.
  const payload: any = {
    ...(input.id ? { id: input.id } : {}),
    family_id: familyId,
    name,
    amount,
  };

  const { data, error } = await supabase.from("bills").upsert(payload).select("*").single();
  if (error) throw error;
  return data as BillRow;
}
