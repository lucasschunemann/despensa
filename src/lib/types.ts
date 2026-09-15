export const PEOPLE = ['Lucas', 'Bela'] as const
export type Person = (typeof PEOPLE)[number]

export type ItemStatus = 'pendente' | 'pegado'

export interface Item {
  id: string
  room_id: string
  name: string
  quantity: string | null
  added_by: string
  status: ItemStatus
  created_at: string
  picked_at: string | null
}
