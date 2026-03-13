import type { JobHandler } from "@/jobs/job-runner";

export const MATERIAL_PROCESSING_JOB = "material_processing" as const;

export const materialProcessingHandler: JobHandler = async (_job) => {};
