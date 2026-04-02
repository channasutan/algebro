'use client'

import { useActionState } from 'react'

import { generateHintAction } from '../actions'
import type { HintActionResult } from '@/modules/ai-tutor/contracts'

interface HintPanelProps {
  attemptId: string
  stepIndex: number
  remainingHints?: number
  isPremium?: boolean
}

function IdleState({
  remainingHints,
  formAction
}: {
  remainingHints?: number
  formAction: (payload: FormData) => void
}) {
  return (
    <div className="space-y-2">
      {typeof remainingHints === 'number' && (
        <p className="text-sm text-gray-600">{remainingHints} hint(s) remaining</p>
      )}
      <form action={formAction}>
        <button
          type="submit"
          aria-label="Get a hint"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Get a hint
        </button>
      </form>
    </div>
  )
}

function PendingState({ formAction }: { formAction: (payload: FormData) => void }) {
  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled
        aria-label="Getting a hint"
        aria-busy="true"
        aria-disabled="true"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 inline-flex items-center gap-2"
      >
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
        />
        <span aria-hidden="true">Getting hint…</span>
        <span className="sr-only">Loading hint, please wait…</span>
      </button>
    </form>
  )
}

function HintDisplayedState({
  hint,
  formAction
}: {
  hint: string
  formAction: (payload: FormData) => void
}) {
  return (
    <div className="space-y-3">
      <div role="status" aria-label="Hint" className="p-4 bg-gray-100 border rounded-lg">
        <p className="text-gray-800">{hint}</p>
      </div>
      <form action={formAction}>
        <button
          type="submit"
          aria-label="Get another hint"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Get another hint
        </button>
      </form>
    </div>
  )
}

function QuotaExceededState({ isPremium = false }: { isPremium?: boolean }) {
  return (
    <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
      <p className="text-red-600">You&apos;ve used all your hints.</p>
      <p className="text-gray-700">0 hints remaining.</p>
      {!isPremium && (
        <a
          href="/upgrade"
          aria-label="Upgrade to Premium for more hints"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Upgrade to Premium
        </a>
      )}
    </div>
  )
}

function AiUnavailableState({
  formAction,
  isPending
}: {
  formAction: (payload: FormData) => void
  isPending: boolean
}) {
  return (
    <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
      <p className="text-red-600">Hints aren&apos;t available right now. Please try again in a moment.</p>
      <form action={formAction}>
        <button
          type="submit"
          aria-label="Retry getting a hint"
          disabled={isPending}
          aria-disabled={isPending ? 'true' : undefined}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:bg-gray-400 inline-flex items-center gap-2"
        >
          {isPending && (
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 rounded-full border-2 border-gray-700 border-t-transparent animate-spin"
            />
          )}
          Retry
          {isPending && <span className="sr-only">Loading hint, please wait…</span>}
        </button>
      </form>
    </div>
  )
}

export function HintPanel({ attemptId, stepIndex, remainingHints, isPremium }: HintPanelProps) {
  const boundAction = generateHintAction.bind(null, attemptId, stepIndex)
  const [state, formAction, isPending] = useActionState<HintActionResult | null, FormData>(
    boundAction,
    null
  )

  const isIdle = state === null && !isPending

  if (isIdle) {
    return (
      <section aria-label="Hint panel" aria-live="polite" className="space-y-3">
        <IdleState remainingHints={remainingHints} formAction={formAction} />
      </section>
    )
  }

  if (isPending) {
    return (
      <section aria-label="Hint panel" aria-live="polite" className="space-y-3">
        <PendingState formAction={formAction} />
      </section>
    )
  }

  if (state?.status === 'hint') {
    return (
      <section aria-label="Hint panel" aria-live="polite" className="space-y-3">
        <HintDisplayedState hint={state.hint} formAction={formAction} />
      </section>
    )
  }

  if (state?.status === 'quota_exceeded') {
    return (
      <section aria-label="Hint panel" aria-live="polite" className="space-y-3">
        <QuotaExceededState isPremium={isPremium} />
      </section>
    )
  }

  return (
    <section aria-label="Hint panel" aria-live="polite" className="space-y-3">
      <AiUnavailableState formAction={formAction} isPending={isPending} />
    </section>
  )
}
