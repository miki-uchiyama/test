'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase'
import type { MealFormRow, Resident } from '@/types'

function toDateString(d: Date) {
  return d.toISOString().split('T')[0]
}

function todayString() {
  return toDateString(new Date())
}

export default function RecordsPage() {
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(todayString())
  const [rows, setRows] = useState<MealFormRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserName(data.user?.email ?? '')
    })
  }, [])

  const loadData = async (date: string) => {
    setLoading(true)

    const { data: residents } = await supabase
      .from('residents')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    const { data: records } = await supabase
      .from('meal_records')
      .select('*')
      .eq('record_date', date)

    const recordMap = new Map((records ?? []).map((r) => [r.resident_id, r]))

    const newRows: MealFormRow[] = (residents ?? []).map((res: Resident) => {
      const rec = recordMap.get(res.id)
      return {
        resident_id: res.id,
        resident_name: res.name,
        office_name: res.office_name,
        breakfast: rec?.breakfast ?? false,
        lunch: rec?.lunch ?? false,
        dinner: rec?.dinner ?? false,
        notes: rec?.notes ?? '',
      }
    })

    setRows(newRows)
    setLoading(false)
  }

  useEffect(() => { loadData(selectedDate) }, [selectedDate])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSave = async () => {
    setSaving(true)

    const upsertData = rows.map((row) => ({
      resident_id: row.resident_id,
      record_date: selectedDate,
      breakfast: row.breakfast,
      lunch: row.lunch,
      dinner: row.dinner,
      notes: row.notes || null,
      created_by: userName,
      updated_by: userName,
    }))

    const { error } = await supabase
      .from('meal_records')
      .upsert(upsertData, { onConflict: 'resident_id,record_date' })

    if (error) {
      showMessage('error', '保存に失敗しました: ' + error.message)
    } else {
      showMessage('success', '食事記録を保存しました')
    }
    setSaving(false)
  }

  const updateRow = (idx: number, field: keyof MealFormRow, value: boolean | string) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const handleDateChange = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(toDateString(d))
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-800">食事提供記録入力</h2>

          {/* 日付選択 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDateChange(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-lg font-bold transition-colors"
            >
              ‹
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field w-auto"
            />
            <button
              onClick={() => handleDateChange(1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-lg font-bold transition-colors"
            >
              ›
            </button>
            <button
              onClick={() => setSelectedDate(todayString())}
              className="text-sm px-3 py-2 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
            >
              今日
            </button>
          </div>
        </div>

        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="text-center text-gray-400 py-16">読み込み中...</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <p>有効な利用者が登録されていません</p>
              <p className="text-sm mt-1">「利用者管理」から利用者を登録してください</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="table-cell min-w-[120px]">利用者名</th>
                    <th className="table-cell min-w-[120px]">事業所</th>
                    <th className="table-cell text-center min-w-[80px]">
                      <span className="text-orange-500">朝食</span>
                    </th>
                    <th className="table-cell text-center min-w-[80px]">
                      <span className="text-yellow-600">昼食</span>
                    </th>
                    <th className="table-cell text-center min-w-[80px]">
                      <span className="text-indigo-600">夕食</span>
                    </th>
                    <th className="table-cell min-w-[200px]">備考</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.resident_id} className="hover:bg-blue-50 transition-colors">
                      <td className="table-cell font-medium text-gray-800">{row.resident_name}</td>
                      <td className="table-cell text-gray-500 text-sm">{row.office_name}</td>
                      <td className="table-cell text-center">
                        <input
                          type="checkbox"
                          checked={row.breakfast}
                          onChange={(e) => updateRow(idx, 'breakfast', e.target.checked)}
                          className="w-6 h-6 rounded accent-orange-500 cursor-pointer"
                        />
                      </td>
                      <td className="table-cell text-center">
                        <input
                          type="checkbox"
                          checked={row.lunch}
                          onChange={(e) => updateRow(idx, 'lunch', e.target.checked)}
                          className="w-6 h-6 rounded accent-yellow-500 cursor-pointer"
                        />
                      </td>
                      <td className="table-cell text-center">
                        <input
                          type="checkbox"
                          checked={row.dinner}
                          onChange={(e) => updateRow(idx, 'dinner', e.target.checked)}
                          className="w-6 h-6 rounded accent-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                          className="input-field py-1 text-sm"
                          placeholder="備考を入力"
                          maxLength={200}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary min-w-[160px]"
            >
              {saving ? '保存中...' : '記録を保存する'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
