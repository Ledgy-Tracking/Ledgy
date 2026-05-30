/**
 * Security utilities
 */

/**
 * Validates a user-provided regular expression pattern to prevent
 * Regular Expression Denial of Service (ReDoS) vulnerabilities.
 *
 * @param pattern The regex pattern string to validate
 * @returns The original pattern if valid, otherwise throws an Error
 */
export function validateRegexPattern(pattern: string): string {
  if (pattern.length > 250) {
    throw new Error('Regex pattern exceeds maximum length of 250 characters.');
  }

  // Heuristic to block dangerous nested quantifiers (e.g., `(a+)+`)
  // Carefully designed to avoid falsely flagging valid lazy quantifiers (e.g., `*?`, `+?`)
  const dangerousPattern = /(?<!\\)(?:[+*]|\{\d+(?:,\d*)?\})\)*[+*]/;
  if (dangerousPattern.test(pattern)) {
    throw new Error('Regex pattern contains potentially dangerous nested quantifiers (ReDoS risk).');
  }

  // Ensure it's a syntactically valid regex
  new RegExp(pattern);

  return pattern;
}
