import { getPracticeSupabaseClient } from "./infrastructure/supabase-provider";
import {
  startSessionForUser,
  createAttemptForUser,
  submitStepForUser,
  completeAttemptForUser,
  DuplicateActiveSessionError
} from './http-facade';

const client = getPracticeSupabaseClient();

export async function startSessionForUser(input: Parameters<typeof startSessionForUser>[1]): Promise<ReturnType<typeof startSessionForUser>> {
  return startSessionForUser(client, input);
}

export async function createAttemptForUser(input: Parameters<typeof createAttemptForUser>[1]): Promise<ReturnType<typeof createAttemptForUser>> {
  return createAttemptForUser(client, input);
}

export async function submitStepForUser(input: Parameters<typeof submitStepForUser>[1]): Promise<ReturnType<typeof submitStepForUser>> {
  return submitStepForUser(client, input);
}

export async function completeAttemptForUser(input: Parameters<typeof completeAttemptForUser>[1]): Promise<ReturnType<typeof completeAttemptForUser>> {
  return completeAttemptForUser(client, input);
}

export { DuplicateActiveSessionError };