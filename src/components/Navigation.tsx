'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'

const navItems = [
  { href: '/records', label: '食事記録入力' },
  { href: '/monthly', label: '月別一覧' },
  { href: '/residents', label: '利用者管理' },
]

export default function Navigation({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-blue-700 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-lg font-bold tracking-wide">食事提供記録システム</h1>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(item.href)
                    ? 'bg-white text-blue-700'
                    : 'hover:bg-blue-600 text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block">{userName}</span>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* モバイルナビ */}
        <nav className="md:hidden flex gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-white text-blue-700'
                  : 'hover:bg-blue-600 text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
