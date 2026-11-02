
/* ILM browser client. This publishable key is designed for frontend use.
   Never place a Supabase secret/service-role key in this file. */
const SUPABASE_URL = "https://yofdwdnahepnnlbhiuzf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PF2COeKUBgIvU7ff20uc0w_cIRiMThL";
if (!window.supabase) {
  console.error("Supabase library did not load. Check your internet connection.");
} else {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
}
