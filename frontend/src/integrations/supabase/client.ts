import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // Bypass navigator.locks to prevent "lock timed out" errors during OAuth
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lock: (name: string, acquireTimeout: number, fn: () => Promise<any>) => fn(),
    }
});
