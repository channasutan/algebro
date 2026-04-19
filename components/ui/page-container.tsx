import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const maxWidthMap = {
  narrow: "max-w-2xl",
  default: "max-w-[var(--content-default)]", // ← references the :root token at runtime
  wide: "max-w-6xl",
  full: "max-w-full",
} as const;

type MaxWidth = keyof typeof maxWidthMap;

interface PageContainerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
  maxWidth?: MaxWidth;
}

/**
 * PageContainer — renders as <main> landmark by default.
 *
 * Accessibility: if the page contains more than one <main> (e.g., inside a modal),
 * pass an `aria-label` prop to distinguish them for screen readers.
 * Example: <PageContainer aria-label="Primary content">
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/main
 */
const PageContainer = React.forwardRef<HTMLElement, PageContainerProps>(
  ({ className, asChild = false, maxWidth = "default", ...props }, ref) => {
    const Comp = asChild ? Slot : "main";
    return (
      <Comp
        ref={ref as React.Ref<HTMLElement>}
        className={cn(
          "mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8",
          maxWidthMap[maxWidth],
          className,
        )}
        {...props}
      />
    );
  },
);
PageContainer.displayName = "PageContainer";

const PageContainerHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8",
      className,
    )}
    {...props}
  />
));
PageContainerHeader.displayName = "PageContainerHeader";

interface PageContainerHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean;
}

const PageContainerHeading = React.forwardRef<
  HTMLHeadingElement,
  PageContainerHeadingProps
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "h1";
  return (
    <Comp
      ref={ref as React.Ref<HTMLHeadingElement>}
      className={cn(
        "text-2xl font-semibold tracking-tight text-[--color-text]",
        className,
      )}
      {...props}
    />
  );
});
PageContainerHeading.displayName = "PageContainerHeading";

const PageContainerActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2 flex-shrink-0", className)}
    {...props}
  />
));
PageContainerActions.displayName = "PageContainerActions";

const PageContainerContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("w-full", className)} {...props} />
));
PageContainerContent.displayName = "PageContainerContent";

export {
  PageContainer,
  PageContainerHeader,
  PageContainerHeading,
  PageContainerActions,
  PageContainerContent,
};
