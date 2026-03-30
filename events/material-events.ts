import type { DomainEvent } from "./event-types";

export const MATERIAL_UPLOADED = "material_uploaded" as const;
export const MATERIAL_PROCESSED = "material_processed" as const;

export type MaterialUploadedPayload = {
  material_id: string;
  user_id: string;
  file_name: string;
};

export type MaterialProcessedPayload = {
  material_id: string;
  topics: string[];
};

export type MaterialUploadedEvent = DomainEvent<MaterialUploadedPayload>;
export type MaterialProcessedEvent = DomainEvent<MaterialProcessedPayload>;
