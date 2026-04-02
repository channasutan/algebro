export type GenerateHintResult =
  | { status: 'hint'; hint: string }
  | { status: 'quota_exceeded' }
  | { status: 'ai_unavailable' }
  | { status: 'validation_error' }
