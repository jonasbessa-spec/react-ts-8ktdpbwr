import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://niwfaytctobvihlukzep.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tE-FEP7SJ8igw5Eko0WZwQ_0Og8GHw7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);