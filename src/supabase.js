import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fxzfaxlhhypiigcmlasx.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Z1cXjCDPE95Vo_GByx9kHA_Ff6dhdJO'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
