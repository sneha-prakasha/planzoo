import { createBrowserClient } from "@supabase/ssr";

// Placeholders let `next build` succeed before you add real env vars.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-key-placeholder";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const supabase = createBrowserClient(url, anon);
