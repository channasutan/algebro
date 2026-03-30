import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server-client'
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client'
import type {
  Material,
  MaterialTopic,
  MaterialStatus,
  InsertMaterialParams,
  InsertMaterialTopicParams,
} from '../domain/material'

export async function insertMaterial(
  client: SupabaseClient,
  params: InsertMaterialParams
): Promise<Material> {
  const { data, error } = await client
    .from('materials')
    .insert({ ...params, status: 'uploaded' })
    .select()
    .single()
  if (error) throw error
  return data as Material
}

export async function getMaterialById(
  client: SupabaseClient,
  materialId: string
): Promise<Material | null> {
  const { data, error } = await client
    .from('materials')
    .select()
    .eq('id', materialId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return (data ?? null) as Material | null
}

export async function getMaterialsByUserId(
  client: SupabaseClient,
  userId: string
): Promise<Material[]> {
  const { data, error } = await client
    .from('materials')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Material[]
}

export async function updateMaterialStatus(
  client: SupabaseClient,
  materialId: string,
  status: MaterialStatus
): Promise<void> {
  const { error } = await client
    .from('materials')
    .update({ status })
    .eq('id', materialId)
  if (error) throw error
}

export async function insertMaterialTopics(
  client: SupabaseClient,
  rows: InsertMaterialTopicParams[]
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await client.from('material_topics').insert(rows)
  if (error) throw error
}

export async function getMaterialTopicsByMaterialId(
  client: SupabaseClient,
  materialId: string
): Promise<MaterialTopic[]> {
  const { data, error } = await client
    .from('material_topics')
    .select()
    .eq('material_id', materialId)
  if (error) throw error
  return (data ?? []) as MaterialTopic[]
}

export function createSupabaseMaterialRepository() {
  return { getClient: getSupabaseServerClient }
}

export function createServiceRoleMaterialRepository() {
  return { getClient: getSupabaseAdminClient }
}
