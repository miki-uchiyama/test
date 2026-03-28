'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase'
import { buildMealCsvData, downloadCsv } from '@/lib/csv'
import type { MealRecord, MealCsvRecord } from '@/types'

// residents + offices ジョイン結果の型（このページ専用）
type ResidentRow = {
  id: string
  name: string
  display_order: number
  is_active: boolean
  offices: { name: string } | null
}

// 食事単価（円）
const MEAL_PRICE = {
  breakfast: 300,
  lunch:     400,
  dinner:    500,
} as const

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function MealCell({ value }: { value: boolean }) {
  return value
    ? <span className="text-blue-600 font-bold">○</span>
    : <span className="text-gray-300">−</span>
}

export default function MonthlyPage() {
  const supabase = createClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [residents, setResidents] = useState<ResidentRow[]>([])
  const [records, setRecords] = useState<MealRecord[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async (y: number, m: number) => {
    setLoading(true)
    const from = `${y}-${pad2(m)}-01`
    const to   = `${y}-${pad2(m)}-${pad2(getDaysInMonth(y, m))}`

    const [{ data: resData }, { data: recData }] = await Promise.all([
      supabase
        .from('residents')
        .select('id, name, display_order, is_active, offices(name)')
        .order('display_order', { ascending: true })
        .order('name',          { ascending: true }),
      supabase
        .from('meal_records')
        .select('*')
        .gte('record_date', from)
        .lte('record_date', to)
        .order('record_date', { ascending: true }),
    ])

    setResidents((resData as unknown as ResidentRow[]) ?? [])
    setRecords((recData as unknown as MealRecord[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData(year, month) }, [year, month])

  const handleMonthChange = (delta: number) => {
    let y = year
    let m = month + delta
    if (m < 1)  { m = 12; y -= 1 }
    if (m > 12) { m = 1;  y += 1 }
    setYear(y)
    setMonth(m)
  }

  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)

  // "residentId-day" → MealRecord のマップ
  const recordMap = new Map<string, MealRecord>()
  records.forEach((r) => {
    const day = parseInt(r.record_date.split('-')[2], 10)
    recordMap.set(`${r.resident_id}-${day}`, r)
  })

  // 利用者ごとの朝・昼・夕それぞれの合計回数
  const calcTotals = (residentId: string) =>
    days.reduce(
      (sum, d) => {
        const r = recordMap.get(`${residentId}-${d}`)
        if (!r) return sum
        return {
          breakfast: sum.breakfast + (r.breakfast ? 1 : 0),
          lunch:     sum.lunch     + (r.lunch     ? 1 : 0),
          dinner:    sum.dinner    + (r.dinner    ? 1 : 0),
        }
      },
      { breakfast: 0, lunch: 0, dinner: 0 }
    )

  // 曜日ラベル（日=赤、土=青）
  const weekDayLabel = (d: number) => {
    const day = new Date(year, month - 1, d).getDay()
    if (day === 0) return <span className="text-red-500">日</span>
    if (day === 6) return <span className="text-blue-500">土</span>
    return <span>{'月火水木金'[day - 1]}</span>
  }

  // CSV出力用データを組み立てて降順ソート（日付×利用者）
  const handleCsvDownload = () => {
    const residentMap = new Map(residents.map((r) => [r.id, r]))
    const csvRows: MealCsvRecord[] = records
      .map((r) => {
        const res = residentMap.get(r.resident_id)
        return {
          record_date:     r.record_date,
          resident_name:   res?.name ?? '',
          office_name:     res?.offices?.name ?? '',
          breakfast:       r.breakfast,
          breakfast_staff: r.breakfast_staff,
          lunch:           r.lunch,
          lunch_staff:     r.lunch_staff,
          dinner:          r.dinner,
          dinner_staff:    r.dinner_staff,
          notes:           r.notes,
          created_by:      r.created_by,
          updated_at:      r.updated_at,
        }
      })
      .sort((a, b) => a.record_date.localeCompare(b.record_date))

    const csv = buildMealCsvData(csvRows, year, month)
    downloadCsv(csv, year, month)
  }

  return (
    <AppShell fullWidth>
      <div className="space-y-4">

        {/* ヘッダー：タイトル＋年月ナビ＋CSV */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-800">月別食事記録一覧</h2>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleMonthChange(-1)}
              aria-label="前月"
              className="w-12 h-12 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-xl font-bold transition-colors"
            >
              ‹
            </button>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input-field w-auto"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>

            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="input-field w-auto"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>

            <button
              onClick={() => handleMonthChange(1)}
              aria-label="次月"
              className="w-12 h-12 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-xl font-bold transition-colors"
            >
              ›
            </button>

            <button
              onClick={handleCsvDownload}
              disabled={records.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              CSV出力
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          各セル（上から）朝食 / 昼食 / 夕食　○=提供あり　−=未提供　―=記録なし
        </p>

        {/* テーブル */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="text-center text-gray-400 py-16">読み込み中...</div>
          ) : residents.length === 0 ? (
            <div className="text-center text-gray-400 py-16">利用者が登録されていません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {/* 固定列：利用者名・事業所 */}
                    <th className="table-cell sticky left-0 bg-gray-50 z-10 text-left font-semibold text-gray-700 min-w-[100px]">
                      利用者名
                    </th>
                    <th className="table-cell sticky left-[100px] bg-gray-50 z-10 text-left font-semibold text-gray-700 min-w-[90px]">
                      事業所
                    </th>
                    {/* 日付列 */}
                    {days.map((d) => (
                      <th key={d} className="table-cell text-center min-w-[34px] px-0.5">
                        <div className="font-semibold text-gray-700">{d}</div>
                        <div className="font-normal">{weekDayLabel(d)}</div>
                      </th>
                    ))}
                    {/* 合計列（朝・昼・夕・金額） */}
                    <th className="table-cell text-center font-semibold text-orange-500 min-w-[72px]">
                      朝計<div className="text-xs font-normal text-gray-400">回数 / 金額</div>
                    </th>
                    <th className="table-cell text-center font-semibold text-yellow-600 min-w-[72px]">
                      昼計<div className="text-xs font-normal text-gray-400">回数 / 金額</div>
                    </th>
                    <th className="table-cell text-center font-semibold text-indigo-600 min-w-[72px]">
                      夕計<div className="text-xs font-normal text-gray-400">回数 / 金額</div>
                    </th>
                    <th className="table-cell text-center font-semibold text-gray-700 min-w-[80px]">合計金額</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((res) => (
                    <tr
                      key={res.id}
                      className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${!res.is_active ? 'opacity-40' : ''}`}
                    >
                      <td className="table-cell sticky left-0 bg-white font-medium text-gray-800 whitespace-nowrap">
                        {res.name}
                        {!res.is_active && <span className="ml-1 text-gray-400">(無効)</span>}
                      </td>
                      <td className="table-cell sticky left-[100px] bg-white text-gray-500 whitespace-nowrap">
                        {res.offices?.name ?? '−'}
                      </td>

                      {days.map((d) => {
                        const rec = recordMap.get(`${res.id}-${d}`)
                        return (
                          <td key={d} className="table-cell text-center px-0.5 py-1">
                            {rec ? (
                              <div className="flex flex-col items-center gap-0 leading-tight">
                                <MealCell value={rec.breakfast} />
                                <MealCell value={rec.lunch} />
                                <MealCell value={rec.dinner} />
                              </div>
                            ) : (
                              <span className="text-gray-200">―</span>
                            )}
                          </td>
                        )
                      })}

                      {(() => {
                        const t = calcTotals(res.id)
                        const breakfastAmount = t.breakfast * MEAL_PRICE.breakfast
                        const lunchAmount     = t.lunch     * MEAL_PRICE.lunch
                        const dinnerAmount    = t.dinner    * MEAL_PRICE.dinner
                        const totalAmount     = breakfastAmount + lunchAmount + dinnerAmount
                        return (
                          <>
                            <td className="table-cell text-center whitespace-nowrap">
                              <div className="font-bold text-orange-500">{t.breakfast}回</div>
                              <div className="text-xs text-orange-400">{breakfastAmount.toLocaleString()}円</div>
                            </td>
                            <td className="table-cell text-center whitespace-nowrap">
                              <div className="font-bold text-yellow-600">{t.lunch}回</div>
                              <div className="text-xs text-yellow-500">{lunchAmount.toLocaleString()}円</div>
                            </td>
                            <td className="table-cell text-center whitespace-nowrap">
                              <div className="font-bold text-indigo-600">{t.dinner}回</div>
                              <div className="text-xs text-indigo-400">{dinnerAmount.toLocaleString()}円</div>
                            </td>
                            <td className="table-cell text-center font-bold text-gray-800 whitespace-nowrap">
                              {totalAmount.toLocaleString()}円
                            </td>
                          </>
                        )
                      })()}
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
