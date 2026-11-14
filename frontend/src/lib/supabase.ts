// Supabase client for OAuth sign-in (Google / Facebook "Continue with...").
// The publishable key is safe for browser use — all privileged work happens
// server-side, and the backend verifies the Supabase session before issuing
// the app's own JWT.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const oauthConfigured = Boolean(supabaseUrl && supabaseKey);
