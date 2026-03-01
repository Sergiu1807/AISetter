import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Admin client — bypasses RLS. Safe because Express auth middleware validates access.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
