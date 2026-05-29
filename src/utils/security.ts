export function validateRegexPattern(pattern: string): string | null {
  if (pattern.length > 250) {
    return 'Regex pattern exceeds maximum length of 250 characters';
  }

  // Heuristic to block dangerous nested quantifiers (e.g., (a+)+ )
  const heuristic = /\([^)]*(?:\+|\*|\{\d+,?\d*\}).*?\)(?:\+|\*|\{\d+,?\d*\})/;
  if (heuristic.test(pattern)) {
    return 'Regex pattern contains potentially dangerous nested quantifiers';
  }

  try {
    new RegExp(pattern);
  } catch (e) {
    return 'Invalid RegEx pattern';
  }

  return null;
}
