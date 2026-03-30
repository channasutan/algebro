import 'server-only';

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventBus } from '@/events/event-bus';
import { createDomainEvent } from '@/events/event-types';
import { geminiClient } from '@/infrastructure/ai/gemini-client';

// ---------------------------------------------------------------------------
// Domain Types
// ---------------------------------------------------------------------------

export type MaterialStatus = 'uploaded' | 'processing' | 'processed' | 'failed';

export type Material = {
  id: string;
  user_id: string;
  title: string;
  file_url: string;
  status: MaterialStatus;
  created_at: string;
};

export type UploadMaterialParams = {
  userId: string;
  title: string;
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
};

export type ExtractedTopic = {
  topic_id: string;
  confidence_score: number;
};

// ---------------------------------------------------------------------------
// Internal Zod schema for AI output validation (Zod ^4.3.6)
// ---------------------------------------------------------------------------

const extractedTopicsSchema = z.array(
  z.object({
    topic_name: z.string().min(1),
    confidence: z.number().min(0).max(1),
  }),
);

type RawAITopic = z.infer<typeof extractedTopicsSchema>[number];

// ---------------------------------------------------------------------------
// 1. uploadMaterial
// ---------------------------------------------------------------------------

/**
 * Uploads a material file to Supabase Storage, persists a DB record,
 * publishes a `material_uploaded` domain event, and enqueues a background
 * job to process the material.
 *
 * Official Storage upload reference:
 * https://supabase.com/docs/reference/javascript/storage-from-upload
 */
export async function uploadMaterial(
  supabase: SupabaseClient,
  eventBus: EventBus,
  params: UploadMaterialParams,
): Promise<Material> {
  const { userId, title, fileBuffer, mimeType, fileName } = params;

  // Build a unique storage path: {userId}/{timestamp}_{fileName}
  const storagePath = `${userId}/${Date.now()}_${fileName}`;

  // Upload to Supabase Storage bucket `materials`
  // Ref: https://supabase.com/docs/reference/javascript/storage-from-upload
  const { error: uploadError } = await supabase.storage
    .from('materials')
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Retrieve the public URL
  // Ref: https://supabase.com/docs/reference/javascript/storage-from-getpublicurl
  const { data: urlData } = supabase.storage
    .from('materials')
    .getPublicUrl(storagePath);

  const fileUrl = urlData.publicUrl;

  // Persist row in `materials` table
  const { data: materialRow, error: insertError } = await supabase
    .from('materials')
    .insert({
      user_id: userId,
      title,
      file_url: fileUrl,
      status: 'uploaded' satisfies MaterialStatus,
    })
    .select()
    .single();

  if (insertError || !materialRow) {
    throw new Error(`Failed to insert material row: ${insertError?.message ?? 'no data returned'}`);
  }

  const material = materialRow as Material;

  // Publish material_uploaded event
  await eventBus.publish(
    createDomainEvent({
      eventType: 'material_uploaded',
      payload: {
        material_id: material.id,
        user_id: userId,
        file_name: fileName,
      },
    }),
  );

  // Enqueue background job for processing
  const { error: jobError } = await supabase
    .from('jobs')
    .insert({
      type: 'material_processing',
      payload: { material_id: material.id },
      status: 'pending',
      attempt_count: 0,
      max_attempts: 3,
    });

  if (jobError) {
    // Non-fatal: log but don't throw — upload already succeeded
    console.error('[uploadMaterial] Failed to enqueue job:', jobError.message);
  }

  return material;
}

// ---------------------------------------------------------------------------
// 2. processMaterial  (called by background job worker)
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full material processing pipeline:
 * 1. Sets status to 'processing'
 * 2. Fetches raw text from the stored file URL
 * 3. Calls Gemini Flash to extract algebra topics
 * 4. Validates AI output with Zod
 * 5. Persists topic mappings in `material_topics`
 * 6. Updates status to 'processed' and publishes event
 *
 * On any failure the status is set to 'failed' — errors are NOT propagated
 * to the caller per ai-architecture.md error handling rules.
 */
export async function processMaterial(
  supabase: SupabaseClient,
  eventBus: EventBus,
  materialId: string,
): Promise<void> {
  // Transition to 'processing'
  await supabase
    .from('materials')
    .update({ status: 'processing' satisfies MaterialStatus })
    .eq('id', materialId);

  try {
    // Fetch material record to get file_url
    const { data: materialRow, error: fetchError } = await supabase
      .from('materials')
      .select('id, file_url, user_id')
      .eq('id', materialId)
      .single();

    if (fetchError || !materialRow) {
      throw new Error(`Material not found: ${fetchError?.message ?? 'no data'}`);
    }

    // Fetch raw text from the file URL
    const rawText = await fetchTextFromUrl(materialRow.file_url as string);

    // Extract topics via Gemini + Zod validation
    const extractedTopics = await extractTopicsWithAI(supabase, rawText);

    // Persist material_topics rows
    if (extractedTopics.length > 0) {
      const topicRows = extractedTopics.map((t) => ({
        material_id: materialId,
        topic_id: t.topic_id,
        confidence_score: t.confidence_score,
      }));

      const { error: topicInsertError } = await supabase
        .from('material_topics')
        .insert(topicRows);

      if (topicInsertError) {
        throw new Error(`Failed to insert material_topics: ${topicInsertError.message}`);
      }
    }

    // Update status to 'processed'
    await supabase
      .from('materials')
      .update({ status: 'processed' satisfies MaterialStatus })
      .eq('id', materialId);

    // Publish material_processed event
    await eventBus.publish(
      createDomainEvent({
        eventType: 'material_processed',
        payload: {
          material_id: materialId,
          topics: extractedTopics.map((t) => t.topic_id),
        },
      }),
    );
  } catch (error) {
    // Graceful failure: update status to 'failed', log, do NOT rethrow
    console.error('[processMaterial] Processing failed for material', materialId, error);

    await supabase
      .from('materials')
      .update({ status: 'failed' satisfies MaterialStatus })
      .eq('id', materialId);
  }
}

// ---------------------------------------------------------------------------
// 3. extractTopicsWithAI  (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Calls Gemini Flash with a structured prompt to extract algebra topics from
 * the given raw text. Validates the AI response using Zod before trusting it.
 *
 * Returns an empty array on any AI, parse, or validation failure — errors
 * are logged but not propagated, per ai-architecture.md Output Safety rules.
 *
 * @param supabase - Used to look up topic_id from the `topics` table by name
 * @param rawText  - Plain text extracted from the uploaded material
 */
export async function extractTopicsWithAI(
  supabase: SupabaseClient,
  rawText: string,
): Promise<ExtractedTopic[]> {
  let rawAITopics: RawAITopic[] = [];

  // --- Gemini call ---
  try {
    const response = await geminiClient.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'You are a mathematics topic extractor. Respond only with valid JSON.\n' +
                'Extract algebra topics from the following text. ' +
                'Return a JSON array of objects with fields: ' +
                'topic_name (string), confidence (0.0-1.0).\n' +
                `Text: ${rawText}`,
            },
          ],
        },
      ],
    });

    const candidateText =
      (response.candidates?.[0] as Record<string, unknown> | undefined
        )?.content as Record<string, unknown> | undefined;

    const parts = candidateText?.parts as Array<{ text?: string }> | undefined;
    const responseText = parts?.[0]?.text ?? '';

    // Strip markdown code fences if present (```json ... ```)
    const jsonText = responseText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    // --- JSON parse ---
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[extractTopicsWithAI] JSON parse failed:', parseError, 'raw:', responseText);
      return [];
    }

    // --- Zod validation ---
    const validation = extractedTopicsSchema.safeParse(parsed);
    if (!validation.success) {
      console.error('[extractTopicsWithAI] Zod validation failed:', validation.error.format());
      return [];
    }

    rawAITopics = validation.data;
  } catch (geminiError) {
    console.error('[extractTopicsWithAI] Gemini call failed:', geminiError);
    return [];
  }

  if (rawAITopics.length === 0) {
    return [];
  }

  // --- Map topic_name → topic_id via `topics` table ---
  const topicNames = rawAITopics.map((t) => t.topic_name);

  const { data: topicRows, error: topicFetchError } = await supabase
    .from('topics')
    .select('id, name')
    .in('name', topicNames);

  if (topicFetchError || !topicRows) {
    console.error('[extractTopicsWithAI] Failed to fetch topics from DB:', topicFetchError?.message);
    return [];
  }

  const nameToId = new Map<string, string>(
    (topicRows as Array<{ id: string; name: string }>).map((r) => [r.name, r.id]),
  );

  const results: ExtractedTopic[] = [];

  for (const aiTopic of rawAITopics) {
    const topicId = nameToId.get(aiTopic.topic_name);
    if (!topicId) {
      // Topic not found in DB — skip (not a hard error)
      continue;
    }
    results.push({
      topic_id: topicId,
      confidence_score: aiTopic.confidence,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

async function fetchTextFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL ${url}: HTTP ${response.status}`);
  }
  return response.text();
}
