import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '../input'
import * as React from 'react'

describe('Input', () => {
  it('renders correctly with default props', () => {
    // Static id prevents snapshot flakiness from auto-generated IDs (useId)
    const { asFragment } = render(<Input placeholder='Enter text' id='default-input' />)
    expect(asFragment()).toMatchSnapshot()
    expect(screen.getByPlaceholderText('Enter text')).toBeDefined()
  })

  it('renders with a label and links it correctly', () => {
    render(<Input label='Username' id='user-input' />)
    const label = screen.getByText('Username')
    const input = screen.getByLabelText('Username') as HTMLInputElement
    
    expect(label).toBeDefined()
    expect(input).toBeDefined()
    expect(input.id).toBe('user-input')
    expect(label.getAttribute('for')).toBe('user-input')
  })

  it('shows error message and sets aria-invalid when error is present', () => {
    render(<Input error='Invalid input' placeholder='error-input' id='error-input-id' />)
    const errorText = screen.getByText('Invalid input')
    const input = screen.getByPlaceholderText('error-input')
    
    expect(errorText).toBeDefined()
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('shows helper text when provided', () => {
    render(<Input helperText='We will never share your email' placeholder='helper-input' id='helper-input-id' />)
    const helperText = screen.getByText('We will never share your email')
    const input = screen.getByPlaceholderText('helper-input')
    
    expect(helperText).toBeDefined()
    expect(input.getAttribute('aria-describedby')).toContain('helper-input-id-helper')
  })

  it('renders left and right elements', () => {
    render(
      <Input 
        id='elements-input'
        leftElement={<span data-testid='left'>L</span>}
        rightElement={<span data-testid='right'>R</span>}
      />
    )
    
    expect(screen.getByTestId('left')).toBeDefined()
    expect(screen.getByTestId('right')).toBeDefined()
  })

  it('disables the input when disabled prop is true', () => {
    render(<Input disabled placeholder='disabled-input' id='disabled-input-id' />)
    const input = screen.getByPlaceholderText('disabled-input') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })
})
