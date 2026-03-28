'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase'
import type { Resident } from '@/types'

type FormData = {
  name: string
  office_name: string
  display_order: number
  is_active: boolean
}

const emptyForm: FormData = { name: '', office_name: '', display_order: 0, is_active: true }

export default function ResidentsPage() {
  const supabase = createClient()
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserEmail(data.user?.email ?? '')
    })
  }, [])

  const fetchResidents = async () => {
    const { data } = await supabase
      .from('residents')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
    setResidents(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchResidents() }, [])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (editingId) {
      const { error } = await supabase
        .from('residents')
        .update({ ...form })
        .eq('id', editingId)
      if (error) { showMessage('error', '更新に失敗しました'); setSaving(false); return }
      showMessage('success', '利用者情報を更新しました')
    } else {
      const { error } = await supabase
        .from('residents')
        .insert({ ...form, created_by: currentUserEmail })
      if (error) { showMessage('error', '登録に失敗しました'); setSaving(false); return }
      showMessage('success', '利用者を登録しました')
    }

    setForm(emptyForm)
    setEditingId(null)
    setSaving(false)
    fetchResidents()
  }

  const handleEdit = (r: Resident) => {
    setEditingId(r.id)
    setForm({ name: r.name, office_name: r.office_name, display_order: r.display_order, is_active: r.is_active })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggleActive = async (r: Resident) => {
    await supabase.from('residents').update({ is_active: !r.is_active }).eq('id', r.id)
    fetchResidents()
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const displayed = residents.filter((r) => showInactive || r.is_active)

  return (
    <AppShell>
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800">利用者マスタ管理</h2>

        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 登録・編集フォーム */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">
            {editingId ? '利用者情報を編集' : '新規利用者を登録'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">氏名 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="input-field"
                placeholder="山田 太郎"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所属事業所 *</label>
              <input
                type="text"
                value={form.office_name}
                onChange={(e) => setForm({ ...form, office_name: e.target.value })}
                required
                className="input-field"
                placeholder="グループホームA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">表示順</label>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                className="input-field"
                min={0}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-5 h-5 rounded accent-blue-600"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">有効</label>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? '保存中...' : editingId ? '更新する' : '登録する'}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="btn-secondary">
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 一覧 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-700">利用者一覧</h3>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              無効の利用者も表示
            </label>
          </div>
          {loading ? (
            <p className="text-center text-gray-400 py-10">読み込み中...</p>
          ) : displayed.length === 0 ? (
            <p className="text-center text-gray-400 py-10">利用者が登録されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="table-cell">氏名</th>
                    <th className="table-cell">所属事業所</th>
                    <th className="table-cell">表示順</th>
                    <th className="table-cell">状態</th>
                    <th className="table-cell">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((r) => (
                    <tr key={r.id} className={`hover:bg-gray-50 ${!r.is_active ? 'opacity-50' : ''}`}>
                      <td className="table-cell font-medium">{r.name}</td>
                      <td className="table-cell">{r.office_name}</td>
                      <td className="table-cell">{r.display_order}</td>
                      <td className="table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {r.is_active ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(r)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium py-1 px-2 rounded hover:bg-blue-50 transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleToggleActive(r)}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium py-1 px-2 rounded hover:bg-gray-100 transition-colors"
                          >
                            {r.is_active ? '無効化' : '有効化'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
