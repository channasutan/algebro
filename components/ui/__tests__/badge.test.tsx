import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Badge } from "../badge"
import * as React from "react"

describe("Badge", () => {
  it("renders correctly with default props", () => {
    const { asFragment } = render(<Badge>Default</Badge>)
    expect(asFragment()).toMatchSnapshot()
    expect(screen.getByText("Default")).toBeDefined()
  })

  it("renders all variants correctly", () => {
    const variants = ["default", "success", "warning", "error", "info"] as const
    variants.forEach((variant) => {
      const { asFragment } = render(<Badge variant={variant}>{variant}</Badge>)
      expect(asFragment()).toMatchSnapshot()
    })
  })

  it("renders both sizes correctly", () => {
    const sizes = ["sm", "md"] as const
    sizes.forEach((size) => {
      const { asFragment } = render(<Badge size={size}>{size}</Badge>)
      expect(asFragment()).toMatchSnapshot()
    })
  })

  it("applies custom className", () => {
    render(<Badge className="custom-class">Custom</Badge>)
    const badge = screen.getByText("Custom")
    expect(badge.className).toContain("custom-class")
  })
})
