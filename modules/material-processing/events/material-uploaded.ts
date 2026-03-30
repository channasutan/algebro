import 'server-only'

import { createDomainEvent, MATERIAL_UPLOADED } from '@/events/event-types'
import type { MaterialUploadedPayload } from '@/events/event-types'

export function createMaterialUploadedEvent(payload: MaterialUploadedPayload) {
  return createDomainEvent({
    eventType: MATERIAL_UPLOADED,
    payload
  })
}
