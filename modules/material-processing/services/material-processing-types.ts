export type MaterialStatus = 'uploaded' | 'processing' | 'processed' | 'failed'

export type Material = {
  id: string
  user_id: string
  file_name: string
  file_url: string
  title: string
  status: MaterialStatus
  uploaded_at: string
  processed_at: string | null
  created_at: string
}

export type MaterialTopic = {
  id: string
  material_id: string
  topic_id: string
  confidence_score: number
}

export type InsertMaterialParams = Omit<Material, 'id' | 'created_at' | 'status' | 'uploaded_at' | 'processed_at'>

export type InsertMaterialTopicParams = Omit<MaterialTopic, 'id'>

export type UploadMaterialParams = {
  userId: string
  title: string
  fileBuffer: Buffer
  mimeType: string
  fileName: string
}

export type ExtractedTopic = {
  topic_id: string
  confidence_score: number
}
