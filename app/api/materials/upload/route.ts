import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { eventBus } from '@/events/event-bus'
import { uploadMaterial } from '@/modules/material-processing/services/material-processing-service'
import { ensureModulesBootstrapped } from '@/modules/bootstrap'
import { getPublicEnv } from '@/config/env.server-entry'

const ACCEPTED_MIME_TYPES_TUPLE = ['application/pdf', 'text/plain'] as const
const ACCEPTED_MIME_TYPES = new Set<string>(ACCEPTED_MIME_TYPES_TUPLE)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

/**
 * Type guard to validate upload input from FormData.
 * Uses type narrowing to ensure TypeScript knows title is string and file is File
 * after this check passes.
 */
function isValidUploadInput(
  title: FormDataEntryValue | null,
  file: FormDataEntryValue | null
): file is File {
  return (
    typeof title === 'string' &&
    title.trim().length > 0 &&
    file instanceof File
  );
}

/**
 * Type assertion helper - tells TypeScript that title is definitely a string
 * after the validation has passed.
 */
function assertString(value: FormDataEntryValue | null): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError('Expected string');
  }
}

/**
 * Type assertion helper - tells TypeScript that file is definitely a File
 * after the validation has passed.
 */
function assertFile(value: FormDataEntryValue | null): asserts value is File {
  if (!(value instanceof File)) {
    throw new TypeError('Expected File');
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Parse FormData
    const formData = await request.formData()
    const title = formData.get('title')
    const file = formData.get('file')

    if (!isValidUploadInput(title, file)) {
      return NextResponse.json(
        { error: 'title and file are required' },
        { status: 400 }
      )
    }

    // TypeScript narrowing - assert title and file are valid types
    assertString(title)
    assertFile(file)

    // 2. Validate file type
    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
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
