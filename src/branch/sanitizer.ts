/**
 * Sanitizes a string segment so it is safe to use in a Git branch name.
 *
 * Git ref rules (subset we enforce):
 * - Cannot contain: space, ~, ^, :, ?, *, [, \, .., @{, //
 * - Cannot start or end with .
 * - Cannot end with .lock
 * - Cannot contain consecutive slashes
 */

/**
 * Slugify a free-text value for use as a branch name segment.
 * Replaces spaces and invalid characters with the given separator.
 */
export function slugify(value: string, separator: string = "-"): string {
  // Normalize unicode characters
  let result = value.normalize("NFKD");

  // Replace common special characters and spaces with separator
  result = result.replace(/[\s_]+/g, separator);

  // Remove characters that are invalid in git refs
  // Keep alphanumeric, hyphens, dots, forward slashes, colons, and the separator
  result = result.replace(/[~^:?*[\\\s@{}]/g, separator);

  // Remove double dots
  result = result.replace(/\.\./g, separator);

  // Remove @{ sequence
  result = result.replace(/@\{/g, separator);

  // Collapse repeated separators (but preserve slashes and colons used as delimiters)
  const escapedSep = escapeRegex(separator);
  result = result.replace(new RegExp(`${escapedSep}{2,}`, "g"), separator);

  // Remove leading/trailing separators
  result = result.replace(new RegExp(`^${escapedSep}+|${escapedSep}+$`, "g"), "");

  // Remove leading/trailing dots
  result = result.replace(/^\.+|\.+$/g, "");

  // Remove trailing .lock
  result = result.replace(/\.lock$/, "");

  return result;
}

/**
 * Validate that a complete branch name conforms to Git ref rules.
 * Returns an error message if invalid, or undefined if valid.
 */
export function validateBranchName(name: string): string | undefined {
  if (!name || name.trim().length === 0) {
    return "Branch name cannot be empty.";
  }

  if (name.startsWith(".") || name.endsWith(".")) {
    return "Branch name cannot start or end with a dot.";
  }

  if (name.endsWith(".lock")) {
    return 'Branch name cannot end with ".lock".';
  }

  if (/\.\./.test(name)) {
    return 'Branch name cannot contain "..".';
  }

  if (/[\s~^:?*[\\\x00-\x1f\x7f]/.test(name)) {
    return "Branch name contains invalid characters.";
  }

  if (/@\{/.test(name)) {
    return 'Branch name cannot contain "@{".';
  }

  if (/\/\//.test(name)) {
    return "Branch name cannot contain consecutive slashes.";
  }

  if (name.startsWith("/") || name.endsWith("/")) {
    return "Branch name cannot start or end with a slash.";
  }

  return undefined;
}

/**
 * Sanitize a complete branch name, applying all git ref rules.
 */
export function sanitizeBranchName(
  name: string,
  separator: string = "-",
  lowercase: boolean = true,
  maxLength: number = 80,
): string {
  let result = name;

  if (lowercase) {
    result = result.toLowerCase();
  }

  // Collapse double dots
  result = result.replace(/\.\./g, ".");

  // Remove @{ sequences
  result = result.replace(/@\{/g, "");

  // Remove characters invalid in git refs (but keep structural chars like / -)
  result = result.replace(/[~^:?*[\\\x00-\x1f\x7f]/g, separator);

  // Collapse consecutive slashes
  result = result.replace(/\/\/+/g, "/");

  // Collapse consecutive separators (that are not slashes)
  if (separator !== "/") {
    const escapedSep = escapeRegex(separator);
    result = result.replace(new RegExp(`${escapedSep}{2,}`, "g"), separator);
  }

  // Remove leading/trailing structural chars
  result = result.replace(/^[/:\-_.]+|[/:\-_.]+$/g, "");

  // Remove trailing .lock
  result = result.replace(/\.lock$/, "");

  if (maxLength > 0 && result.length > maxLength) {
    result = result.slice(0, maxLength);
    // Avoid truncating mid-separator
    result = result.replace(/[/:\-_.]+$/, "");
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
