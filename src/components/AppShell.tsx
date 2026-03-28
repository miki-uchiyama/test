import { createClient } from '@/lib/supabase-server'
import Navigation from './Navigation'

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userName = user?.email ?? ''

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation userName={userName} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
