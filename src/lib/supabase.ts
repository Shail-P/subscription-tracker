import { createClient } from '@supabase/supabase-js'

// Vite exposes VITE_* variables to the renderer at build time. Use the project's
// public publishable/anon key here, never a private service-role key. RLS protects rows.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// Share one client across components so auth and database requests use the same session.
// Returning null when configuration is missing lets the login page show setup guidance.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        // PKCE exchanges a browser-returned code for a session using a saved verifier.
        flowType: 'pkce',
        // Persist the session locally between launches and refresh tokens automatically.
        persistSession: true,
        autoRefreshToken: true,
        // LoginPage handles the browser callback forwarded by Electron, not this page's URL.
        detectSessionInUrl: false,
      },
    })
  : null
