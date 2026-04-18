import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Card, CardHeader, CardBody, CardFooter } from "../card"
import * as React from "react"

describe("Card", () => {
  it("renders correctly with subcomponents", () => {
    const { asFragment } = render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardBody>Body Content</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(asFragment()).toMatchSnapshot()
    expect(screen.getByText("Header")).toBeDefined()
    expect(screen.getByText("Body Content")).toBeDefined()
    expect(screen.getByText("Footer")).toBeDefined()
  })

  it("applies shadow variants correctly", () => {
    const { rerender } = render(<Card shadow="none">None</Card>)
    const noneCard = screen.getByText("None")
    expect(noneCard.className).not.toContain("shadow-[--shadow-sm]")
    
    rerender(<Card shadow="sm">Sm</Card>)
    const smCard = screen.getByText("Sm")
    expect(smCard.className).toContain("shadow-[--shadow-sm]")
    
    rerender(<Card shadow="md">Md</Card>)
    const mdCard = screen.getByText("Md")
    expect(mdCard.className).toContain("shadow-[--shadow-md]")
  })

  it("passes padding through context to subcomponents", () => {
    render(
      <Card padding="lg">
        <CardHeader>Header</CardHeader>
        <CardBody>Body</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    
    expect(screen.getByText("Header").className).toContain("px-8")
    expect(screen.getByText("Body").className).toContain("p-8")
    expect(screen.getByText("Footer").className).toContain("px-8")
  })

  it("renders as different element when asChild is true", () => {
    render(
      <Card asChild>
        <section data-testid="section-card">Section Content</section>
      </Card>
    )
    
    const card = screen.getByTestId("section-card")
    expect(card.tagName).toBe("SECTION")
    expect(card.className).toContain("bg-[--color-surface]")
  })
})
