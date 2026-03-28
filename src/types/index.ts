export type Resident = {
  id: string
  name: string
  office_name: string
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
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export type MealRecordWithResident = MealRecord & {
  residents: Pick<Resident, 'name' | 'office_name'>
}

export type MealFormRow = {
  resident_id: string
  resident_name: string
  office_name: string
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  notes: string
}
