'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function UpdatePasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
        if (error) {
          setMessage({ type: 'error', text: 'リンクが無効か期限切れです。もう一度パスワードリセットを依頼してください。' })
        } else {
          setReady(true)
        }
      })
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true)
        else setMessage({ type: 'error', text: 'リンクが無効です。もう一度パスワードリセットを依頼してください。' })
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'パスワードが一致しません' })
      return
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'パスワードは6文字以上で入力してください' })
      return
    }
    setSaving(true)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage({ type: 'error', text: 'パスワードの更新に失敗しました: ' + error.message })
      setSaving(false)
    } else {
      setMessage({ type: 'success', text: 'パスワードを更新しました。ログイン画面に移動します...' })
      setTimeout(() => router.push('/login'), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-800 mb-2">パスワードの再設定</h1>
        <p className="text-sm text-gray-500 mb-6">新しいパスワードを入力してください</p>

        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {!ready && !message && (
          <p className="text-center text-gray-400 py-4">確認中...</p>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="6文字以上"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード（確認）</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="input-field"
                placeholder="もう一度入力してください"
              />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full mt-2">
              {saving ? '更新中...' : 'パスワードを更新する'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">読み込み中...</p></div>}>
      <UpdatePasswordForm />
    </Suspense>
  )
}
