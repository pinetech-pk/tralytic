import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TradeInsert } from "@/lib/types/database";
import type { ParsedTrade } from "./transform";

type Client = SupabaseClient<Database>;

const CHUNK_SIZE = 500;

/**
 * Match strategy names (case-insensitive) to existing strategy ids for the user,
 * creating any that don't exist. Returns a lowercased-name -> id map.
 */
export async function resolveStrategies(
  supabase: Client,
  userId: string,
  names: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const wanted = names.map((n) => n.trim()).filter(Boolean);
  if (wanted.length === 0) return map;

  const { data: existing, error } = await supabase
    .from("strategies")
    .select("id, name")
    .eq("user_id", userId);
  if (error) throw error;

  for (const s of existing ?? []) {
    map.set(s.name.trim().toLowerCase(), s.id);
  }

  const missing = wanted.filter((n) => !map.has(n.toLowerCase()));
  // De-duplicate by lowercased name.
  const uniqueMissing = [...new Map(missing.map((n) => [n.toLowerCase(), n])).values()];

  if (uniqueMissing.length > 0) {
    const { data: created, error: insertError } = await supabase
      .from("strategies")
      .insert(uniqueMissing.map((name) => ({ user_id: userId, name, is_active: true })))
      .select("id, name");
    if (insertError) throw insertError;

    for (const s of created ?? []) {
      map.set(s.name.trim().toLowerCase(), s.id);
    }
  }

  return map;
}

export interface InsertResult {
  inserted: number;
  failed: number;
  error: string | null;
}

/** Insert parsed trades in chunks, filling user_id, account_id and strategy_id. */
export async function insertTrades(
  supabase: Client,
  userId: string,
  accountId: string,
  trades: ParsedTrade[],
  strategyMap: Map<string, string>
): Promise<InsertResult> {
  const rows: TradeInsert[] = trades.map(({ strategyName, ...rest }) => ({
    ...rest,
    user_id: userId,
    account_id: accountId,
    strategy_id: strategyName ? strategyMap.get(strategyName.toLowerCase()) ?? null : null,
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("trades").insert(chunk);
    if (error) {
      return { inserted, failed: rows.length - inserted, error: error.message };
    }
    inserted += chunk.length;
  }

  return { inserted, failed: 0, error: null };
}
