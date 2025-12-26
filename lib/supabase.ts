import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

// These MUST match your Supabase project settings.
// You can move them to an `.env` file later — for now, hardcode while developing.
const SUPABASE_URL = 'https://lgpbgnyqzfechavgufnj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncGJnbnlxemZlY2hhdmd1Zm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODMzNzIsImV4cCI6MjA4MjA1OTM3Mn0.9VULVuMXQKB64pViwe8vhtr-diJX6A42wUo4dS4TuZE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
