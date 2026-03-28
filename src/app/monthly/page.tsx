'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase'
import { buildMealCsvData, downloadCsv } from '@/lib/csv'
import type { MealRecord, Resident } from '@/types'

type RecordWithResident = MealRecord & { residents: Pick<Resident, 'name' | 'office_name'> }

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function mealIcon(value: boolean) {
  return value
    ? <span className="text-blue-600 font-bold text-base">○</span>
    : <span className="text-gray-300 text-base">−</span>
}

export default function MonthlyPage() {
  const supabase = createClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [records, setRecords] = useState<RecordWithResident[]>([])
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async (y: number, m: number) => {
    setLoading(true)
    const from = `${y}-${pad2(m)}-01`
    const to = `${y}-${pad2(m)}-${pad2(getDaysInMonth(y, m))}`

    const [{ data: resData }, { data: recData }] = await Promise.all([
      supabase
        .from('residents')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('meal_records')
        .select('*, residents(name, office_name)')
        .gte('record_date', from)
        .lte('record_date', to)
        .order('record_date', { ascending: true }),
    ])

    setResidents(resData ?? [])
    setRecords((recData as RecordWithResident[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData(year, month) }, [year, month])

  const handleMonthChange = (delta: number) => {
    let y = year
    let m = month + delta
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setYear(y)
    setMonth(m)
  }

  const handleCsvDownload = () => {
    const csv = buildMealCsvData(records, year, month)
    downloadCsv(csv, year, month)
  }

  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)

  const recordMap = new Map<string, RecordWithResident>()
  records.forEach((r) => {
    const day = parseInt(r.record_date.split('-')[2], 10)
    recordMap.set(`${r.resident_id}-${day}`, r)
  })

  const totalCount = (resident_id: string) => {
    let total = 0
    days.forEach((d) => {
      const r = recordMap.get(`${resident_id}-${d}`)
      if (r) total += (r.breakfast ? 1 : 0) + (r.lunch ? 1 : 0) + (r.dinner ? 1 : 0)
    })
    return total
  }

  const weekDayLabel = (d: number) => {
    const date = new Date(year, month - 1, d)
    const labels = ['日', '月', '火', '水', '木', '金', '土']
    const label = labels[date.getDay()]
    if (date.getDay() === 0) return <span className="text-red-500">{label}</span>
    if (date.getDay() === 6) return <span className="text-blue-500">{label}</span>
    return <span>{label}</span>
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-800">月別食事記録一覧</h2>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 年月ナビ */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleMonthChange(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-lg font-bold transition-colors"
              >
                ‹
              </button>
              <div className="flex gap-1">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="input-field w-auto py-2"
                >
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="input-field w-auto py-2"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleMonthChange(1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-lg font-bold transition-colors"
              >
                ›
              </button>
            </div>

            <button
              onClick={handleCsvDownload}
              disabled={records.length === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <span>CSV出力</span>
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          ○：提供あり　−：記録なし／未提供
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="text-center text-gray-400 py-16">読み込み中...</div>
          ) : residents.length === 0 ? (
            <div className="text-center text-gray-400 py-16">利用者が登録されていません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse text-sm">
                <thead>
                  {/* 日付行 */}
                  <tr className="bg-gray-50">
                    <th className="table-cell sticky left-0 bg-gray-50 z-10 font-semibold text-gray-700 min-w-[100px]">利用者名</th>
                    <th className="table-cell sticky left-[100px] bg-gray-50 z-10 font-semibold text-gray-700 min-w-[90px]">事業所</th>
                    {days.map((d) => (
                      <th key={d} className="table-cell text-center min-w-[52px]">
                        <div className="font-semibold text-gray-700">{d}</div>
                        <div className="text-xs font-normal">{weekDayLabel(d)}</div>
                      </th>
                    ))}
                    <th className="table-cell text-center min-w-[60px] font-semibold text-gray-700">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((res) => (
                    <tr key={res.id} className={`hover:bg-blue-50 transition-colors ${!res.is_active ? 'opacity-50' : ''}`}>
                      <td className="table-cell sticky left-0 bg-white font-medium text-gray-800 whitespace-nowrap">
                        {res.name}
                        {!res.is_active && <span className="ml-1 text-xs text-gray-400">(無効)</span>}
                      </td>
                      <td className="table-cell sticky left-[100px] bg-white text-gray-500 text-xs whitespace-nowrap">
                        {res.office_name}
                      </td>
                      {days.map((d) => {
                        const rec = recordMap.get(`${res.id}-${d}`)
                        return (
                          <td key={d} className="table-cell text-center p-1">
                            {rec ? (
                              <div className="flex flex-col items-center gap-0.5 text-xs">
                                <span title="朝食">{mealIcon(rec.breakfast)}</span>
                                <span title="昼食">{mealIcon(rec.lunch)}</span>
                                <span title="夕食">{mealIcon(rec.dinner)}</span>
                              </div>
                            ) : (
                              <span className="text-gray-200 text-xs">―</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="table-cell text-center font-bold text-blue-700">
                        {totalCount(res.id)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 凡例 */}
        <div className="text-xs text-gray-500 bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="font-medium mb-1">表の見方（各セル 上から）：朝食 / 昼食 / 夕食</p>
          <p>○ = 提供あり　− = 記録なし・未提供　― = 当日の記録未入力</p>
        </div>
      </div>
    </AppShell>
  )
}
