export type Resident = {
  id: string
  name: string
  office_id: string        // DB上の外部キー（offices.id）
  display_order: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type MealRecord = {
  id: string
  resident_id: string
  record_date: string
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  notes: string | null
  breakfast_staff: string  // 朝食担当者名
  lunch_staff: string      // 昼食担当者名
  dinner_staff: string     // 夕食担当者名
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

// 画面表示・CSV用：利用者名と事業所名を文字列で持つ行データ
export type MealFormRow = {
  resident_id: string
  resident_name: string
  office_id: string        // 担当者のグループ分けに使用
  office_name: string      // 表示用（offices.name を JOIN して取得）
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  notes: string
}

// CSV生成用：1レコード分のフラットなデータ
export type MealCsvRecord = {
  record_date: string
  resident_name: string
  office_name: string
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  breakfast_staff: string
  lunch_staff: string
  dinner_staff: string
  notes: string | null
  created_by: string
  updated_at: string
}
