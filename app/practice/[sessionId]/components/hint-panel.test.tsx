// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as React from 'react'

vi.mock('../actions', () => ({
  generateHintAction: vi.fn()
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useActionState: vi.fn()
  }
})

import { HintPanel } from './hint-panel'
import type { HintActionResult } from '@/modules/ai-tutor/contracts'

function mockActionState(state: HintActionResult | null, isPending: boolean) {
  const formAction = vi.fn()
  vi.mocked(React.useActionState).mockReturnValue([
    state,
    formAction,
    isPending
  ] as unknown as ReturnType<typeof React.useActionState>)
}

describe('HintPanel', () => {
  it('idle: renders Get a hint button visible and enabled', () => {
    mockActionState(null, false)

    render(<HintPanel attemptId="attempt-1" stepIndex={0} remainingHints={3} />)

    const button = screen.getByRole('button', { name: /get a hint/i })
    expect(button).toBeTruthy()
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(screen.getByText(/3 hint\(s\) remaining/i)).toBeTruthy()
    expect(screen.getByRole('region', { name: /hint panel/i }).getAttribute('aria-live')).toBe('polite')
  })

  it('pending: button disabled and loading indicator present', () => {
    mockActionState(null, true)

    render(<HintPanel attemptId="attempt-1" stepIndex={0} />)

    const button = screen.getByRole('button', { name: /getting a hint/i })
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByText(/loading hint, please wait/i)).toBeTruthy()
  })

  it('hint displayed: renders hint text', () => {
    mockActionState({ status: 'hint', hint: 'Try factoring...' }, false)

    render(<HintPanel attemptId="attempt-1" stepIndex={0} />)

    expect(screen.getByText('Try factoring...')).toBeTruthy()
    expect(screen.getByRole('status', { name: /hint/i })).toBeTruthy()
  })

  it('quota_exceeded: shows 0 hints remaining and upgrade CTA without raw details', () => {
    mockActionState({ status: 'quota_exceeded', remaining: 0 }, false)

    render(<HintPanel attemptId="attempt-1" stepIndex={0} isPremium={false} />)

    expect(screen.getByText(/0 hints remaining/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /upgrade to premium for more hints/i })).toBeTruthy()
    expect(screen.queryByText(/stack|error:|\sat\s/i)).toBeNull()
  })

  it('ai_unavailable: shows user friendly retry message and no raw error details', () => {
    mockActionState({ status: 'ai_unavailable' }, false)

    render(<HintPanel attemptId="attempt-1" stepIndex={0} />)

    expect(screen.getByText(/hints aren't available right now/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /retry getting a hint/i })).toBeTruthy()
    expect(screen.queryByText(/stack|error:|\sat\s/i)).toBeNull()
  })
})
