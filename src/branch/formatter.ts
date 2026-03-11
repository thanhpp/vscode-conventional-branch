import { slugify } from "./sanitizer";

export interface FormatOptions {
  separator: string;
  lowercase: boolean;
  maxLength: number;
}

/**
 * Parse a format template to extract the ordered list of variable names.
 * Example: "{user}:{scope}/{type}/{service}/{description}" → ["user","scope","type","service","description"]
 */
export function parseTemplate(format: string): string[] {
  const matches = [...format.matchAll(/\{(\w+)\}/g)];
  return matches.map((m) => m[1]);
}

/**
 * Interpolate collected values into the branch name template.
 *
 * Steps:
 * 1. Replace each {variable} with its collected value (slugified).
 * 2. Collapse empty optionals — any structural separator before/after an empty slot
 *    that results in consecutive delimiters is reduced to a single delimiter.
 * 3. Strip leading/trailing delimiters.
 * 4. Optionally lowercase and truncate.
 */
export function formatBranch(
  format: string,
  values: Record<string, string>,
  options: FormatOptions,
): string {
  let result = format;

  // Replace all {variable} tokens with slugified values
  for (const [key, rawValue] of Object.entries(values)) {
    const slugged =
      rawValue.trim().length > 0 ? slugify(rawValue.trim(), options.separator) : "";
    result = result.replace(`{${key}}`, slugged);
  }

  // Remove any remaining unreplaced {variable} tokens (variables not collected)
  result = result.replace(/\{(\w+)\}/g, "");

  // Collapse consecutive structural separators to the first one
  // This handles cases like "user:/type" when scope is empty → "user:/type" becomes "user:type"
  // We collapse sequences of mixed delimiters (/:-_.) into just the first character
  result = result.replace(/([/:_\-.])[/:_\-.]+/g, "$1");

  // Strip leading/trailing structural chars
  result = result.replace(/^[/:_\-.]+|[/:_\-.]+$/g, "");

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  if (options.maxLength > 0 && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
    // Don't leave a trailing structural char after truncation
    result = result.replace(/[/:_\-.]+$/, "");
  }

  return result;
}

/**
 * Build a preview of the branch name given partial collected values.
 * Unreplaced tokens show as placeholder markers in the preview.
 */
export function previewBranch(
  format: string,
  values: Record<string, string>,
  options: FormatOptions,
): string {
  let result = format;

  // Replace collected values
  for (const [key, rawValue] of Object.entries(values)) {
    const slugged =
      rawValue.trim().length > 0 ? slugify(rawValue.trim(), options.separator) : "";
    result = result.replace(`{${key}}`, slugged || `{${key}}`);
  }

  if (options.lowercase) {
    // Only lowercase the replaced portions — keep {variable} tokens readable
    result = result
      .split(/(\{[^}]+\})/)
      .map((part) => (part.startsWith("{") && part.endsWith("}") ? part : part.toLowerCase()))
      .join("");
  }

  return result;
}
