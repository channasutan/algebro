import 'server-only'

import { createDomainEvent, MATERIAL_PROCESSED } from '@/events/event-types'
import type { MaterialProcessedPayload } from '@/events/event-types'

export function createMaterialProcessedEvent(payload: MaterialProcessedPayload) {
  return createDomainEvent({
    eventType: MATERIAL_PROCESSED,
    payload
  })
}
