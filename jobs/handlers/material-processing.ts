import 'server-only';

import type { JobHandler } from '@/jobs/job-runner';
import { createSupabaseServiceRoleClient } from '@/infrastructure/supabase/service-role-client';
import { eventBus } from '@/events/event-bus';
import { processMaterial } from '@/modules/material-processing/services/material-processing-service';

export const MATERIAL_PROCESSING_JOB = 'material_processing' as const;

/**
 * Background job handler for processing uploaded materials.
 *
 * Expects job.payload to contain { material_id: string }.
 * Delegates to processMaterial() which handles all error states gracefully.
 */
export const materialProcessingHandler: JobHandler = async (job) => {
  const materialId = (job.payload as Record<string, unknown>).material_id;

  if (typeof materialId !== 'string' || !materialId) {
    throw new Error(`[material-processing] Invalid job payload: missing material_id`);
  }

  const supabase = createSupabaseServiceRoleClient();

  await processMaterial(supabase, eventBus, materialId);
};
