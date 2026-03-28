'use client'

import { useEffect, useState } from 'react'
import Navigation from './Navigation'
import { createClient } from '@/lib/supabase'

export default function AppShell({
  children,
  fullWidth = false,
}: {
  children: React.ReactNode
  fullWidth?: boolean
}) {
  const supabase = createClient()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserName(data.user?.email ?? '')
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation userName={userName} />
      <main className={`flex-1 w-full mx-auto px-4 py-6 ${fullWidth ? '' : 'max-w-6xl'}`}>
        {children}
      </main>
    </div>
  )
}
