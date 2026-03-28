'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // パスワードリセット用
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    router.push('/records')
    router.refresh()
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage(null)

    const redirectTo = `${window.location.origin}/auth/confirm`

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo,
    })

    if (error) {
      setResetMessage({ type: 'error', text: 'メールの送信に失敗しました。メールアドレスを確認してください。' })
    } else {
      setResetMessage({ type: 'success', text: 'パスワードリセット用のメールを送信しました。メールをご確認ください。' })
    }
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">食事提供記録システム</h1>
          <p className="text-sm text-gray-500 mt-1">グループホーム管理</p>
        </div>

        {!showReset ? (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field"
                  placeholder="staff@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-center"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setShowReset(true); setResetMessage(null) }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                パスワードをお忘れですか？
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-gray-700 mb-1">パスワードのリセット</h2>
            <p className="text-sm text-gray-500 mb-4">
              登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
            </p>

            {resetMessage && (
              <div className={`rounded-lg px-4 py-3 text-sm font-medium mb-4 ${
                resetMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {resetMessage.text}
              </div>
            )}

            {!resetMessage?.type || resetMessage.type === 'error' ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="input-field"
                    placeholder="staff@example.com"
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="btn-primary w-full text-center"
                >
                  {resetLoading ? '送信中...' : 'リセットメールを送信'}
                </button>
              </form>
            ) : null}

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setShowReset(false); setResetMessage(null) }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                ログイン画面に戻る
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
