/**
 * Mandatory context for all service-level operations.
 * Enforces explicit request correlation across async boundaries.
 */
export type ServiceContext = {
  requestId: string;
};

export type Phase = "insert" | "retry" | "read_after_insert" | "infra";

export type LogDomain = "user-profiles" | "system" | "practice";

export type EventName = `${LogDomain}.${string}` | "unknown_event";
 
 export type BaseMeta = {
   type: "system";
   phase: Phase;
   outcome?: "success" | "failure";
   invalidEvent?: boolean;
   [key: string]: unknown;
 };
 
 export type DomainMeta = {
   type: "domain";
   userId: string;
   phase: Phase;
   outcome?: "success" | "failure";
   durationMs?: number;
   invalidEvent?: boolean;
   [key: string]: unknown;
 };

/**
 * Strict schema for all structured log events.
 * Ensures consistent, queryable observability data.
 */
export type LogEvent = {
  event: EventName;
  requestId?: string;
  meta: BaseMeta | DomainMeta;
};
