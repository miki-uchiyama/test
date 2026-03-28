'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase'
import type { MealFormRow } from '@/types'

type ResidentRow = {
  id: string
  name: string
  office_id: string
  display_order: number
  offices: { id: string; name: string } | null
}

type StaffRow = {
  id: string
  name: string
  office_id: string | null
}

type OfficeStaff = {
  breakfast: string
  lunch: string
  dinner: string
}

// 当日表示される事業所（利用者から導出）
type OfficeInView = { id: string; name: string }

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayString(): string {
  return toDateString(new Date())
}

export default function RecordsPage() {
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(todayString())
  const [rows, setRows] = useState<MealFormRow[]>([])
  const [officeList, setOfficeList] = useState<OfficeInView[]>([])
  // 事業所ID → 朝・昼・夕の担当者名
  const [officeStaff, setOfficeStaff] = useState<Record<string, OfficeStaff>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loginUserEmail, setLoginUserEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [staffList, setStaffList] = useState<StaffRow[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setLoginUserEmail(data.user?.email ?? '')
    })
    supabase
      .from('staff')
      .select('id, name, office_id')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name',          { ascending: true })
      .then(({ data }) => setStaffList(data ?? []))
  }, [])

  useEffect(() => {
    loadData(selectedDate)
  }, [selectedDate])

  const loadData = async (date: string) => {
    setLoading(true)

    const { data: residents, error: residentsError } = await supabase
      .from('residents')
      .select('id, name, office_id, display_order, offices(id, name)')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name',          { ascending: true })

    if (residentsError) {
      showMessage('error', '利用者の取得に失敗しました')
      setLoading(false)
      return
    }

    const { data: existingRecords } = await supabase
      .from('meal_records')
      .select('resident_id, breakfast, lunch, dinner, notes, breakfast_staff, lunch_staff, dinner_staff')
      .eq('record_date', date)

    const recordMap = new Map(
      (existingRecords ?? []).map((r) => [r.resident_id, r])
    )

    const residentList = (residents as unknown as ResidentRow[]) ?? []

    // 事業所一覧（利用者の所属を元に重複排除で生成）
    const seen = new Set<string>()
    const offices: OfficeInView[] = []
    residentList.forEach((res) => {
      const oid = res.office_id ?? 'unknown'
      if (!seen.has(oid)) {
        seen.add(oid)
        offices.push({ id: oid, name: res.offices?.name ?? '（事業所未設定）' })
      }
    })
    setOfficeList(offices)

    // 事業所ごとの担当者を既存レコードから復元
    const newOfficeStaff: Record<string, OfficeStaff> = {}
    offices.forEach(({ id: officeId }) => {
      const residentIdsInOffice = residentList
        .filter((r) => (r.office_id ?? 'unknown') === officeId)
        .map((r) => r.id)
      const found = residentIdsInOffice
        .map((id) => recordMap.get(id))
        .find((r) => r !== undefined)
      newOfficeStaff[officeId] = {
        breakfast: found?.breakfast_staff ?? '',
        lunch:     found?.lunch_staff     ?? '',
        dinner:    found?.dinner_staff    ?? '',
      }
    })
    setOfficeStaff(newOfficeStaff)

    const newRows: MealFormRow[] = residentList.map((res) => {
      const existing = recordMap.get(res.id)
      return {
        resident_id:   res.id,
        resident_name: res.name,
        office_id:     res.office_id ?? 'unknown',
        office_name:   res.offices?.name ?? '（事業所未設定）',
        breakfast:     existing?.breakfast ?? false,
        lunch:         existing?.lunch     ?? false,
        dinner:        existing?.dinner    ?? false,
        notes:         existing?.notes     ?? '',
      }
    })

    setRows(newRows)
    setLoading(false)
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const updateOfficeStaff = (
    officeId: string,
    meal: 'breakfast' | 'lunch' | 'dinner',
    value: string
  ) => {
    setOfficeStaff((prev) => ({
      ...prev,
      [officeId]: {
        ...(prev[officeId] ?? { breakfast: '', lunch: '', dinner: '' }),
        [meal]: value,
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)

    const upsertData = rows.map((row) => {
      const staff = officeStaff[row.office_id] ?? { breakfast: '', lunch: '', dinner: '' }
      return {
        resident_id:     row.resident_id,
        record_date:     selectedDate,
        breakfast:       row.breakfast,
        lunch:           row.lunch,
        dinner:          row.dinner,
        notes:           row.notes || null,
        breakfast_staff: staff.breakfast,
        lunch_staff:     staff.lunch,
        dinner_staff:    staff.dinner,
        created_by:      loginUserEmail,
        updated_by:      loginUserEmail,
      }
    })

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
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  const handleDateChange = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(toDateString(d))
  }

  // 事業所に紐づく職員 ＋ 事業所未設定の職員（全事業所共通）
  const staffForOffice = (officeId: string) =>
    staffList.filter((s) => !s.office_id || s.office_id === officeId)

  return (
    <AppShell>
      <div className="space-y-4">

        {/* 日付ナビ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-800">食事提供記録入力</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => handleDateChange(-1)} aria-label="前の日"
              className="w-12 h-12 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-xl font-bold transition-colors">
              ‹
            </button>
            <input type="date" value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field w-auto text-base" />
            <button onClick={() => handleDateChange(1)} aria-label="次の日"
              className="w-12 h-12 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-xl font-bold transition-colors">
              ›
            </button>
            <button onClick={() => setSelectedDate(todayString())}
              className="h-12 px-4 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium">
              今日
            </button>
          </div>
        </div>

        {/* 事業所別担当者選択エリア */}
        {officeList.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 space-y-4">
            <p className="text-sm font-semibold text-gray-600">担当者（保存前に選択してください）</p>
            {officeList.map(({ id: officeId, name: officeName }) => {
              const staff = staffForOffice(officeId)
              const current = officeStaff[officeId] ?? { breakfast: '', lunch: '', dinner: '' }
              return (
                <div key={officeId} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                  <p className="text-xs font-semibold text-gray-500 mb-2">{officeName}</p>
                  {staff.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      この事業所に紐づく職員がいません（職員管理で所属事業所を設定してください）
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-4">
                      {([
                        { label: '朝食担当', color: 'text-orange-500', meal: 'breakfast' as const, value: current.breakfast },
                        { label: '昼食担当', color: 'text-yellow-600', meal: 'lunch'     as const, value: current.lunch     },
                        { label: '夕食担当', color: 'text-indigo-600', meal: 'dinner'    as const, value: current.dinner    },
                      ]).map(({ label, color, meal, value }) => (
                        <div key={meal} className="flex items-center gap-2">
                          <span className={`text-sm font-medium whitespace-nowrap ${color}`}>{label}</span>
                          <select
                            value={value}
                            onChange={(e) => updateOfficeStaff(officeId, meal, e.target.value)}
                            className="input-field w-32 py-2"
                          >
                            <option value="">（未選択）</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* メッセージ */}
        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* テーブル */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="text-center text-gray-400 py-16 text-base">読み込み中...</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-gray-500 py-16 space-y-1">
              <p className="font-medium">有効な利用者が登録されていません</p>
              <p className="text-sm">「利用者管理」から利用者を登録してください</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="table-cell text-left font-semibold text-gray-600 min-w-[120px]">利用者名</th>
                    <th className="table-cell text-left font-semibold text-gray-600 min-w-[120px]">事業所</th>
                    <th className="table-cell text-center font-semibold text-orange-500 min-w-[72px]">朝食</th>
                    <th className="table-cell text-center font-semibold text-yellow-600 min-w-[72px]">昼食</th>
                    <th className="table-cell text-center font-semibold text-indigo-600 min-w-[72px]">夕食</th>
                    <th className="table-cell text-left font-semibold text-gray-600 min-w-[180px]">備考</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.resident_id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="table-cell font-medium text-gray-800">{row.resident_name}</td>
                      <td className="table-cell text-gray-500 text-sm">{row.office_name}</td>
                      <td className="table-cell text-center">
                        <label className="flex items-center justify-center cursor-pointer p-2">
                          <input type="checkbox" checked={row.breakfast}
                            onChange={(e) => updateRow(idx, 'breakfast', e.target.checked)}
                            className="w-7 h-7 rounded accent-orange-500 cursor-pointer" />
                        </label>
                      </td>
                      <td className="table-cell text-center">
                        <label className="flex items-center justify-center cursor-pointer p-2">
                          <input type="checkbox" checked={row.lunch}
                            onChange={(e) => updateRow(idx, 'lunch', e.target.checked)}
                            className="w-7 h-7 rounded accent-yellow-500 cursor-pointer" />
                        </label>
                      </td>
                      <td className="table-cell text-center">
                        <label className="flex items-center justify-center cursor-pointer p-2">
                          <input type="checkbox" checked={row.dinner}
                            onChange={(e) => updateRow(idx, 'dinner', e.target.checked)}
                            className="w-7 h-7 rounded accent-indigo-500 cursor-pointer" />
                        </label>
                      </td>
                      <td className="table-cell">
                        <input type="text" value={row.notes}
                          onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                          className="input-field py-2 text-sm"
                          placeholder="備考を入力"
                          maxLength={200} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        {rows.length > 0 && (
          <div className="flex justify-end pb-4">
            <button onClick={handleSave} disabled={saving}
              className="btn-primary min-w-[180px] text-base">
              {saving ? '保存中...' : '記録を保存する'}
            </button>
          </div>
        )}

      </div>
    </AppShell>
  )
}
