import 'server-only';

import type { JobHandler } from '@/jobs/job-runner';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import {
  NonRetryableJobError,
} from '@/jobs/job-runner';
import { eventBus } from '@/events/event-bus';
import { processMaterial } from '@/modules/material-processing/services/material-processing-service';

export const MATERIAL_PROCESSING_JOB = 'material_processing' as const;

type MaterialProcessingPayload = {
  material_id: string;
};

function readPayload(payload: Record<string, unknown>): MaterialProcessingPayload {
  const materialId = payload.material_id;

  if (typeof materialId !== 'string' || materialId.trim().length === 0) {
    throw new NonRetryableJobError(
      '[jobs.material-processing] invalid payload: material_id is required'
    );
  }

  return { material_id: materialId };
}

/**
 * Background job handler for processing uploaded materials.
 *
 * Expects job.payload to contain { material_id: string }.
 * Delegates to processMaterial() which handles all error states gracefully.
 */
export const materialProcessingHandler: JobHandler = async (job) => {
  const { material_id } = readPayload(job.payload as Record<string, unknown>);

  const supabase = getSupabaseAdminClient();

  await processMaterial(supabase, eventBus, material_id);
};
