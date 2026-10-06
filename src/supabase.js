import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'O_TEU_SUPABASE_URL'
const supabaseKey = 'A_TUA_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)