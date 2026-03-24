/**
 * Error thrown when template rendering fails.
 */
export class RenderError extends Error {
  constructor(message: string) {
    super(`[render-template] ${message}`);
    this.name = "RenderError";
  }
}

/**
 * Substitutes parameters into a LaTeX template string.
 *
 * Supports two syntaxes:
 * - `$param` - simple parameter substitution
 * - `${param}` - explicit parameter substitution
 *
 * @param templateLatex - Template string with placeholders
 * @param parameters - Key-value pairs for substitution
 * @returns Rendered LaTeX string with all placeholders replaced
 * @throws RenderError if parameters are missing or substitution is incomplete
 */
export function renderTemplate(
  templateLatex: string,
  parameters: Record<string, number>
): string {
  if (!templateLatex) {
    throw new RenderError("Template cannot be empty");
  }

  if (!parameters || Object.keys(parameters).length === 0) {
    // No parameters to substitute - return template as-is
    // But validate there are no placeholders expecting parameters
    if (hasPlaceholders(templateLatex)) {
      throw new RenderError(
        `Template contains placeholders but no parameters provided: ${extractPlaceholders(templateLatex).join(", ")}`
      );
    }
    return templateLatex;
  }

  let rendered = templateLatex;

  // Replace ${param} syntax first (more specific pattern)
  for (const [paramName, value] of Object.entries(parameters)) {
    const pattern = new RegExp(`\\$\\{${escapeRegex(paramName)}\\}`, "g");
    rendered = rendered.replace(pattern, String(value));
  }

  // Replace $param syntax second
  for (const [paramName, value] of Object.entries(parameters)) {
    const pattern = new RegExp(`\\$${escapeRegex(paramName)}(?!\\w)`, "g");
    rendered = rendered.replace(pattern, String(value));
  }

  // Validate all placeholders were replaced
  const remainingPlaceholders = extractPlaceholders(rendered);
  if (remainingPlaceholders.length > 0) {
    throw new RenderError(
      `Unresolved placeholders after rendering: ${remainingPlaceholders.join(", ")}`
    );
  }

  return rendered;
}

/**
 * Checks if template contains any placeholders.
 */
function hasPlaceholders(template: string): boolean {
  return /\$\{?\w+\}?/.test(template);
}

/**
 * Extracts all placeholder names from a template.
 */
function extractPlaceholders(template: string): string[] {
  const placeholders: string[] = [];
  const pattern = /\$\{?(\w+)\}?/g;
  let match;

  while ((match = pattern.exec(template)) !== null) {
    placeholders.push(match[1]);
  }

  return [...new Set(placeholders)]; // Remove duplicates
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
