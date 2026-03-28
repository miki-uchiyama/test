'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[supabase.ts] 環境変数が設定されていません。\n' +
    '.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定して、' +
    'サーバーを再起動してください。'
  )
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey)
}
