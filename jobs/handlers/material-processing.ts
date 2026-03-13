import type { Job, JobHandler } from "../job-runner";
import { registerJobHandler } from "../job-runner";

export const MATERIAL_PROCESSING_JOB = "material_processing";

export interface MaterialProcessingPayload {
  materialId: string;
  userId: string;
  fileName: string;
}

export const materialProcessingHandler: JobHandler = async (job: Job): Promise<void> => {
  const payload = job.payload as MaterialProcessingPayload;
  
  console.log(`[material_processing] Processing material: ${payload.materialId}`);
  
  await Promise.resolve();
};

registerJobHandler(MATERIAL_PROCESSING_JOB, materialProcessingHandler);
