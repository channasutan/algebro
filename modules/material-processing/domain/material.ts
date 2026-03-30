export type MaterialStatus = 'uploaded' | 'processing' | 'processed' | 'failed'

export type Material = {
  id: string
  user_id: string
  title: string
  file_url: string
  status: MaterialStatus
  created_at: string
}

export type MaterialTopic = {
  id: string
  material_id: string
  topic_id: string
  confidence_score: number
}

export type InsertMaterialParams = Omit<Material, 'id' | 'created_at' | 'status'>
export type InsertMaterialTopicParams = Omit<MaterialTopic, 'id'>
