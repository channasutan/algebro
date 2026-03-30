import 'server-only';

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventBus } from '@/events/event-bus';
import { createDomainEvent } from '@/events/event-types';
import { geminiClient } from '@/infrastructure/ai/gemini-client';
import type { Material, MaterialStatus, UploadMaterialParams, ExtractedTopic } from './material-processing-types';

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
  const fileUrl = await uploadToStorage(supabase, params);
  const material = await insertMaterialRow(supabase, params, fileUrl);

  await eventBus.publish(
    createDomainEvent({
      eventType: 'material_uploaded',
      payload: {
        material_id: material.id,
        user_id: params.userId,
        file_name: params.fileName,
      },
    }),
  );

  await enqueueProcessingJob(supabase, material.id);

  return material;
}

// ---------------------------------------------------------------------------
// Private helpers for uploadMaterial
// ---------------------------------------------------------------------------

/**
 * Uploads the file buffer to Supabase Storage and returns the public URL.
 */
async function uploadToStorage(
  supabase: SupabaseClient,
  params: UploadMaterialParams,
): Promise<string> {
  const storagePath = `${params.userId}/${Date.now()}_${params.fileName}`;

  const { error } = await supabase.storage
    .from('materials')
    .upload(storagePath, params.fileBuffer, {
      contentType: params.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('materials')
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

/**
 * Inserts a new material row into the database.
 */
async function insertMaterialRow(
  supabase: SupabaseClient,
  params: UploadMaterialParams,
  fileUrl: string,
): Promise<Material> {
  const { data, error } = await supabase
    .from('materials')
    .insert({
      user_id: params.userId,
      title: params.title,
      file_name: params.fileName,
      file_url: fileUrl,
      status: 'uploaded' satisfies MaterialStatus,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert material row: ${error?.message ?? 'no data returned'}`);
  }

  return data as Material;
}

/**
 * Enqueues a background job to process the uploaded material.
 * Errors are logged but never thrown - job enqueue is best-effort.
 */
async function enqueueProcessingJob(
  supabase: SupabaseClient,
  materialId: string,
): Promise<void> {
  try {
    const { error } = await supabase.from('jobs').insert({
      type: 'material_processing',
      payload: { material_id: materialId },
      status: 'pending',
      attempt_count: 0,
      max_attempts: 3,
    });

    if (error) {
      console.warn('[material-processing] Failed to enqueue job', {
        materialId,
        error: error.message,
      });
    }
  } catch (err) {
    console.warn('[material-processing] Failed to enqueue job', {
      materialId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
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
  await setMaterialStatus(supabase, materialId, 'processing');

  try {
    const materialRow = await fetchMaterialRow(supabase, materialId);
    const rawText = await fetchTextFromUrl(materialRow.file_url);
    const extractedTopics = await extractTopicsWithAI(supabase, rawText);
    await persistMaterialTopics(supabase, materialId, extractedTopics);
    await setMaterialStatus(supabase, materialId, 'processed');
    await publishProcessedEvent(eventBus, materialId, extractedTopics);
  } catch (error) {
    // Graceful failure: update status to 'failed', log, do NOT rethrow
    console.error('[processMaterial] Processing failed for material', materialId, error);

    await setMaterialStatus(supabase, materialId, 'failed');
  }
}

// ---------------------------------------------------------------------------
// Private helpers for processMaterial
// ---------------------------------------------------------------------------

/**
 * Sets the status of a material in the database.
 */
async function setMaterialStatus(
  supabase: SupabaseClient,
  materialId: string,
  status: MaterialStatus,
): Promise<void> {
  await supabase
    .from('materials')
    .update({ status: status satisfies MaterialStatus })
    .eq('id', materialId);
}

/**
 * Fetches a material row from the database.
 */
async function fetchMaterialRow(
  supabase: SupabaseClient,
  materialId: string,
): Promise<{ id: string; file_url: string; user_id: string }> {
  const { data: materialRow, error: fetchError } = await supabase
    .from('materials')
    .select('id, file_url, user_id')
    .eq('id', materialId)
    .single();

  if (fetchError || !materialRow) {
    throw new Error(`Material not found: ${fetchError?.message ?? 'no data'}`);
  }

  return materialRow as { id: string; file_url: string; user_id: string };
}

/**
 * Persists extracted topics to the material_topics table.
 */
async function persistMaterialTopics(
  supabase: SupabaseClient,
  materialId: string,
  extractedTopics: ExtractedTopic[],
): Promise<void> {
  if (extractedTopics.length === 0) {
    return;
  }

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

/**
 * Publishes the material_processed event.
 */
async function publishProcessedEvent(
  eventBus: EventBus,
  materialId: string,
  extractedTopics: ExtractedTopic[],
): Promise<void> {
  await eventBus.publish(
    createDomainEvent({
      eventType: 'material_processed',
      payload: {
        material_id: materialId,
        topics: extractedTopics.map((t) => t.topic_id),
      },
    }),
  );
}

/**
 * Fetches text content from a URL.
 */
async function fetchTextFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL ${url}: HTTP ${response.status}`);
  }
  return response.text();
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

    const jsonText = parseGeminiResponse(response);
    const rawAITopics = parseAndValidateAITopics(jsonText);

    if (!rawAITopics || rawAITopics.length === 0) {
      return [];
    }

    return await mapTopicsToIds(supabase, rawAITopics);
  } catch (geminiError) {
    console.error('[extractTopicsWithAI] Gemini call failed:', geminiError);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Private helpers for extractTopicsWithAI
// ---------------------------------------------------------------------------

/**
 * Extracts the text from the Gemini response candidate and strips markdown code fences.
 */
function parseGeminiResponse(response: unknown): string {
  const responseRecord = response as Record<string, unknown>;
  const candidates = responseRecord.candidates as Array<Record<string, unknown>> | undefined;
  const candidateText = candidates?.[0]?.content as Record<string, unknown> | undefined;

  const parts = candidateText?.parts as Array<{ text?: string }> | undefined;
  const responseText = parts?.[0]?.text ?? '';

  // Strip markdown code fences if present (```json ... ```)
  return responseText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

/**
 * Parses JSON and validates with Zod schema.
 * Returns validated data or null on failure (logs errors internally).
 */
function parseAndValidateAITopics(jsonText: string): RawAITopic[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (parseError) {
    console.error('[extractTopicsWithAI] JSON parse failed:', parseError, 'raw:', jsonText);
    return null;
  }

  const validation = extractedTopicsSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('[extractTopicsWithAI] Zod validation failed:', validation.error.format());
    return null;
  }

  return validation.data;
}

/**
 * Maps topic names to topic IDs via the database.
 * Returns ExtractedTopic[] (skips unmatched topics).
 */
async function mapTopicsToIds(
  supabase: SupabaseClient,
  rawAITopics: RawAITopic[],
): Promise<ExtractedTopic[]> {
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
