import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Button } from "../button"
import * as React from "react"

describe("Button", () => {
  it("renders correctly with default props", () => {
    const { asFragment } = render(<Button>Click me</Button>)
    expect(asFragment()).toMatchSnapshot()
    expect(screen.getByText("Click me")).toBeDefined()
  })

  it("renders all variants correctly", () => {
    const variants = ["primary", "secondary", "ghost", "destructive"] as const
    variants.forEach((variant) => {
      const { asFragment } = render(<Button variant={variant}>{variant}</Button>)
      expect(asFragment()).toMatchSnapshot()
    })
  })

  it("renders all sizes correctly", () => {
    const sizes = ["sm", "md", "lg"] as const
    sizes.forEach((size) => {
      const { asFragment } = render(<Button size={size}>{size}</Button>)
      expect(asFragment()).toMatchSnapshot()
    })
  })

  it("disables the button and shows spinner when isLoading is true", () => {
    const handleClick = vi.fn()
    render(<Button isLoading onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole("button") as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.querySelector("svg")).toBeDefined()
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it("renders as a different element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test" data-testid="link-btn">Link Button</a>
      </Button>
    )
    
    const link = screen.getByTestId("link-btn")
    expect(link).toBeDefined()
    expect(link.tagName).toBe("A")
    expect(link.className).toContain("bg-[--color-primary]")
  })

  it("renders left and right icons", () => {
    render(
      <Button 
        leftIcon={<span data-testid="left-icon">L</span>}
        rightIcon={<span data-testid="right-icon">R</span>}
      >
        With Icons
      </Button>
    )
    
    expect(screen.getByTestId("left-icon")).toBeDefined()
    expect(screen.getByTestId("right-icon")).toBeDefined()
  })
})
