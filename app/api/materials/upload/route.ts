import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { eventBus } from '@/events/event-bus'
import { uploadMaterial } from '@/modules/material-processing/services/material-processing-service'
import { ensureModulesBootstrapped } from '@/modules/bootstrap'
import { getPublicEnv } from '@/config/env.server-entry'

const ACCEPTED_MIME_TYPES = ['application/pdf', 'text/plain']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Parse FormData
    const formData = await request.formData()
    const title = formData.get('title')
    const file = formData.get('file')

    if (!title || typeof title !== 'string' || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'title and file are required' },
        { status: 400 }
      )
    }

    // 2. Validate file type
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and plain text are accepted.' },
        { status: 400 }
      )
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File must be 10MB or less' },
        { status: 400 }
      )
    }

    // 4. Auth check
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 5. Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // 6. Call service
    await ensureModulesBootstrapped()
    const material = await uploadMaterial(supabase, eventBus, {
      userId: user.id,
      title,
      fileBuffer,
      mimeType: file.type,
      fileName: file.name,
    })

    return NextResponse.json(
      { success: true, materialId: material.id },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/materials/upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}