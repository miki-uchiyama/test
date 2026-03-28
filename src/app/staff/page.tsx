'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase'

type StaffMember = {
  id: string
  name: string
  office_id: string | null
  display_order: number
  is_active: boolean
  offices: { name: string } | null
}

type OfficeOption = {
  id: string
  name: string
}

type FormData = {
  name: string
  office_id: string
  display_order: number
  is_active: boolean
}

const emptyForm: FormData = { name: '', office_id: '', display_order: 0, is_active: true }

export default function StaffPage() {
  const supabase = createClient()
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [offices, setOffices] = useState<OfficeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('staff')
      .select('id, name, office_id, display_order, is_active, offices(name)')
      .order('display_order', { ascending: true })
      .order('name',          { ascending: true })
    setStaffList((data as unknown as StaffMember[]) ?? [])
    setLoading(false)
  }

  const fetchOffices = async () => {
    const { data } = await supabase
      .from('offices')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true })
    setOffices(data ?? [])
  }

  useEffect(() => {
    fetchStaff()
    fetchOffices()
  }, [])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      name:         form.name.trim(),
      office_id:    form.office_id || null,
      display_order: form.display_order,
      is_active:    form.is_active,
    }

    if (editingId) {
      const { error } = await supabase.from('staff').update(payload).eq('id', editingId)
      if (error) { showMessage('error', '更新に失敗しました'); setSaving(false); return }
      showMessage('success', '職員情報を更新しました')
    } else {
      const { error } = await supabase.from('staff').insert(payload)
      if (error) {
        const msg = error.message.includes('unique') ? '同じ名前の職員がすでに登録されています' : '登録に失敗しました'
        showMessage('error', msg)
        setSaving(false)
        return
      }
      showMessage('success', '職員を登録しました')
    }

    setForm(emptyForm)
    setEditingId(null)
    setSaving(false)
    fetchStaff()
  }

  const handleEdit = (s: StaffMember) => {
    setEditingId(s.id)
    setForm({ name: s.name, office_id: s.office_id ?? '', display_order: s.display_order, is_active: s.is_active })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggleActive = async (s: StaffMember) => {
    await supabase.from('staff').update({ is_active: !s.is_active }).eq('id', s.id)
    fetchStaff()
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const displayed = staffList.filter((s) => showInactive || s.is_active)

  return (
    <AppShell>
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800">職員管理</h2>

        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 登録・編集フォーム */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">
            {editingId ? '職員情報を編集' : '新しい職員を登録'}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                職員名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="input-field w-40"
                placeholder="例：田中"
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所属事業所</label>
              <select
                value={form.office_id}
                onChange={(e) => setForm({ ...form, office_id: e.target.value })}
                className="input-field w-44"
              >
                <option value="">（全事業所共通）</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">表示順</label>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                className="input-field w-24"
                min={0}
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <input
                type="checkbox"
                id="staff_is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-5 h-5 rounded accent-blue-600"
              />
              <label htmlFor="staff_is_active" className="text-sm font-medium text-gray-700">有効</label>
            </div>
            <div className="flex gap-2">
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
            <h3 className="font-semibold text-gray-700">
              職員一覧
              <span className="ml-2 text-sm font-normal text-gray-400">
                （有効：{staffList.filter((s) => s.is_active).length}名）
              </span>
            </h3>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              無効の職員も表示
            </label>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-10">読み込み中...</p>
          ) : displayed.length === 0 ? (
            <p className="text-center text-gray-400 py-10">職員が登録されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500">
                    <th className="table-cell">職員名</th>
                    <th className="table-cell">所属事業所</th>
                    <th className="table-cell">表示順</th>
                    <th className="table-cell">状態</th>
                    <th className="table-cell">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!s.is_active ? 'opacity-50' : ''}`}
                    >
                      <td className="table-cell font-medium text-gray-800">{s.name}</td>
                      <td className="table-cell text-gray-600">
                        {s.offices?.name ?? <span className="text-gray-400">全事業所共通</span>}
                      </td>
                      <td className="table-cell text-gray-500">{s.display_order}</td>
                      <td className="table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {s.is_active ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(s)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium py-1 px-2 rounded hover:bg-blue-50 transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleToggleActive(s)}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium py-1 px-2 rounded hover:bg-gray-100 transition-colors"
                          >
                            {s.is_active ? '無効化' : '有効化'}
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

        <p className="text-xs text-gray-400">
          ※ 所属事業所を設定した職員は、その事業所の記録入力画面にのみ表示されます。「全事業所共通」にした場合はすべての事業所に表示されます。
        </p>
        <p className="text-xs text-gray-400">
          ※ 無効化した職員は食事記録入力の担当者プルダウンに表示されなくなります
        </p>
      </div>
    </AppShell>
  )
}
