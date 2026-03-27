declare const __latexBrand: unique symbol;

export type LatexString = string & { readonly [__latexBrand]: typeof __latexBrand };

export function toLatexString(raw: string): LatexString {
  return raw as LatexString;
}

export function isLatexString(value: unknown): value is LatexString {
  return typeof value === "string";
}