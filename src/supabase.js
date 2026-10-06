import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://supabase.com/dashboard/project/rpnukuhrgttfcwdwixnc/sql/c6348510-ed22-4d58-8276-94479ff96da3'
const supabaseKey = 'p9afZ03FZwTha5uZ'

export const supabase = createClient(supabaseUrl, supabaseKey)