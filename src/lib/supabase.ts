"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

function storageAvailable(): boolean {
  try {
    const k = "__sb_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const memoryStore: Record<string, string> = {};
const memoryStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, value: string) => { memoryStore[key] = value; },
  removeItem: (key: string) => { delete memoryStore[key]; },
};

/**
 * Returns the Supabase client, or null when env vars are absent
 * (local preview mode — no auth gate, sample data only).
 *
 * Falls back to in-memory storage when localStorage is blocked
 * (iOS private browsing, third-party cookie settings, etc.)
 * so login still works within a single browser session.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) {
    const useMemory = !storageAvailable();
    client = createClient(url, anonKey, useMemory ? {
      auth: { storage: memoryStorage, persistSession: true },
    } : undefined);
  }
  return client;
}
