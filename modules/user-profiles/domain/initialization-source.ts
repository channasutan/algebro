/**
 * Contextual reason for profile initialization.
 * Used for observability and to justify the bootstrap side-effect.
 */
export enum InitializationSource {
  LAZY_PAGE_LOAD = "lazy_page_load",
  AUTH_CALLBACK = "auth_callback",
  SYSTEM_MIGRATION = "system_migration",
}
