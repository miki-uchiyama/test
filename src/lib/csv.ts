import type { MealCsvRecord } from '@/types'

type CsvRow = {
  日付: string
  利用者名: string
  所属事業所: string
  朝食: string
  朝食担当者: string
  昼食: string
  昼食担当者: string
  夕食: string
  夕食担当者: string
  備考: string
  登録者: string
  更新日時: string
}

export function buildMealCsvData(
  records: MealCsvRecord[],
  year: number,
  month: number
): string {
  const headers: (keyof CsvRow)[] = [
    '日付', '利用者名', '所属事業所',
    '朝食', '朝食担当者', '昼食', '昼食担当者', '夕食', '夕食担当者',
    '備考', '登録者', '更新日時',
  ]

  const rows: CsvRow[] = records.map((r) => ({
    日付: r.record_date,
    利用者名: r.resident_name,
    所属事業所: r.office_name,
    朝食: r.breakfast ? '○' : '×',
    朝食担当者: r.breakfast_staff,
    昼食: r.lunch ? '○' : '×',
    昼食担当者: r.lunch_staff,
    夕食: r.dinner ? '○' : '×',
    夕食担当者: r.dinner_staff,
    備考: r.notes ?? '',
    登録者: r.created_by,
    更新日時: new Date(r.updated_at).toLocaleString('ja-JP'),
  }))

  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(',')
    ),
  ]

  // UTF-8 BOM付き（Excelで文字化けしないよう）
  return '\uFEFF' + csvLines.join('\r\n')
}

export function downloadCsv(content: string, year: number, month: number): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `食事記録_${year}年${String(month).padStart(2, '0')}月.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
