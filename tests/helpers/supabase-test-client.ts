import { createClient } from '@supabase/supabase-js';

export function getTestClient() {
  return createClient('http://localhost:54321', 'test-anon-key');
}

export function getAdminTestClient() {
  return createClient('http://localhost:54321', 'test-service-role-key');
}