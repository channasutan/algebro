import 'server-only'

// ---------------------------------------------------------------------------
// Material event constants
// ---------------------------------------------------------------------------

export const MATERIAL_UPLOADED = 'material_uploaded' as const
export const MATERIAL_PROCESSED = 'material_processed' as const

// ---------------------------------------------------------------------------
// Material event payload types
// ---------------------------------------------------------------------------

export type MaterialUploadedPayload = {
  material_id: string
  user_id: string
  file_name: string
}

export type MaterialProcessedPayload = {
  material_id: string
  topics: string[]
}