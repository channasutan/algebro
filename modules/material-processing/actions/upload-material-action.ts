'use server'

import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { eventBus } from '@/events/event-bus'
import { uploadMaterial } from '@/modules/material-processing/services/material-processing-service'
import { ensureModulesBootstrapped } from '@/modules/bootstrap'
import { getPublicEnv } from '@/config/env.server-entry'

const ACCEPTED_MIME_TYPES = ['application/pdf', 'text/plain'] as const
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

const uploadMaterialInputSchema = z.object({
  title: z.string().min(1).max(255),
  mimeType: z.enum(ACCEPTED_MIME_TYPES),
  fileSizeBytes: z.number().max(MAX_FILE_SIZE_BYTES, 'File must be 10MB or less'),
})

export type UploadMaterialActionResult =
  | { success: true; materialId: string }
  | { success: false; error: string }

export async function uploadMaterialAction(
  formData: FormData
): Promise<UploadMaterialActionResult> {
  try {
    // 1. Parse FormData
    const title = formData.get('title')
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return { success: false, error: 'No file provided' }
    }

    // 2. Zod validation
    const result = uploadMaterialInputSchema.safeParse({
      title,
      mimeType: file.type,
      fileSizeBytes: file.size,
    })

    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message ?? 'Invalid input' }
    }

    const { title: validatedTitle, mimeType } = result.data

    // 3. Auth check
    const cookieStore = await cookies()
    const { supabaseUrl, supabaseAnonKey } = getPublicEnv()
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // 4. Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // 5. Call service
    await ensureModulesBootstrapped()
    const material = await uploadMaterial(supabase, eventBus, {
      userId: user.id,
      title: validatedTitle,
      fileBuffer,
      mimeType,
      fileName: file.name,
    })

    return { success: true, materialId: material.id }
  } catch (err) {
    console.error('[uploadMaterialAction]', err)
    return { success: false, error: 'Upload failed. Please try again.' }
  }
}