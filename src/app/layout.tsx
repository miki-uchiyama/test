import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '食事提供記録システム',
  description: 'グループホーム 食事提供記録管理',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}
