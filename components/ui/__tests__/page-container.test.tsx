import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import {
  PageContainer,
  PageContainerHeader,
  PageContainerHeading,
  PageContainerActions,
  PageContainerContent,
} from '../page-container'

// Helper to reduce asChild test duplication
function renderAsChild(
  Component: React.ComponentType<{ asChild?: boolean; className?: string; children?: React.ReactNode }>,
  testId: string,
  childTag: Extract<keyof React.JSX.IntrinsicElements, string>,
  expectedClass: string
) {
  render(
    <Component asChild>
      {React.createElement(childTag, { 'data-testid': testId }, 'Content')}
    </Component>
  )
  const element = screen.getByTestId(testId)
  expect(element.tagName).toBe(childTag.toUpperCase())
  expect(element.className).toContain(expectedClass)
}

describe('PageContainer', () => {
  it('renders correctly (snapshot)', () => {
    const { asFragment } = render(<PageContainer>Content</PageContainer>)
    expect(asFragment()).toMatchSnapshot()
    expect(screen.getByRole('main')).toBeDefined()
  })

  it('renders as <main> by default', () => {
    render(<PageContainer>Content</PageContainer>)
    expect(screen.getByRole('main').tagName).toBe('MAIN')
  })

  it('applies maxWidth variants correctly', () => {
    const { rerender } = render(<PageContainer maxWidth="narrow">Narrow</PageContainer>)
    expect(screen.getByRole('main').className).toContain('max-w-2xl')

    rerender(<PageContainer maxWidth="default">Default</PageContainer>)
    expect(screen.getByRole('main').className).toContain('max-w-[var(--content-default)]')

    rerender(<PageContainer maxWidth="wide">Wide</PageContainer>)
    expect(screen.getByRole('main').className).toContain('max-w-6xl')

    rerender(<PageContainer maxWidth="full">Full</PageContainer>)
    expect(screen.getByRole('main').className).toContain('max-w-full')
  })

  it('renders as child element when asChild is true', () => {
    renderAsChild(PageContainer, 'as-child-section', 'section', 'mx-auto')
  })

  it('forwards custom className', () => {
    render(<PageContainer className="custom-class">Content</PageContainer>)
    expect(screen.getByRole('main').className).toContain('custom-class')
  })
})

describe('PageContainerHeader', () => {
  it('renders children correctly', () => {
    render(<PageContainerHeader>Header Content</PageContainerHeader>)
    expect(screen.getByText('Header Content')).toBeDefined()
  })

  it('applies responsive flex classes', () => {
    render(<PageContainerHeader>Header</PageContainerHeader>)
    const header = screen.getByText('Header')
    expect(header.className).toContain('flex-col')
    expect(header.className).toContain('sm:flex-row')
  })
})

describe('PageContainerHeading', () => {
  it('renders as <h1> by default', () => {
    render(<PageContainerHeading>Title</PageContainerHeading>)
    expect(screen.getByRole('heading', { level: 1 }).tagName).toBe('H1')
  })

  it('renders as child element when asChild is true', () => {
    renderAsChild(PageContainerHeading, 'heading-h2', 'h2', 'text-2xl')
  })
})

describe('PageContainerActions', () => {
  it('renders children correctly', () => {
    render(<PageContainerActions>Action</PageContainerActions>)
    expect(screen.getByText('Action')).toBeDefined()
  })

  it('applies flex layout classes', () => {
    render(<PageContainerActions>Action</PageContainerActions>)
    const actions = screen.getByText('Action')
    expect(actions.className).toContain('flex')
    expect(actions.className).toContain('items-center')
  })
})

describe('PageContainerContent', () => {
  it('renders children correctly', () => {
    render(<PageContainerContent>Content Area</PageContainerContent>)
    expect(screen.getByText('Content Area')).toBeDefined()
  })

  it('applies w-full class and forwards className', () => {
    render(<PageContainerContent className="extra-class">Content</PageContainerContent>)
    const content = screen.getByText('Content')
    expect(content.className).toContain('w-full')
    expect(content.className).toContain('extra-class')
  })
})

describe('PageContainer Composition', () => {
  it('renders full composition correctly (snapshot)', () => {
    const { asFragment } = render(
      <PageContainer>
        <PageContainerHeader>
          <PageContainerHeading>Page Title</PageContainerHeading>
          <PageContainerActions>
            <button>Action</button>
          </PageContainerActions>
        </PageContainerHeader>
        <PageContainerContent>
          <p>Main content area</p>
        </PageContainerContent>
      </PageContainer>
    )
    expect(asFragment()).toMatchSnapshot()
    expect(screen.getByRole('heading', { name: /page title/i })).toBeDefined()
    expect(screen.getByText('Main content area')).toBeDefined()
    expect(screen.getByRole('button', { name: /action/i })).toBeDefined()
  })
})
