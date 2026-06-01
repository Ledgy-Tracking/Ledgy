export function validateRegexPattern(pattern: string): boolean {
  if (!pattern) return true;
  if (pattern.length > 250) return false;

  // Block dangerous nested quantifiers (e.g., (a+)+, (a*)*)
  // Matches a group containing + or * followed by another + or *
  // Does not flag lazy quantifiers (e.g., *?) because ? is not matched as the outer quantifier
  if (/\([^)]*[+*][^)]*\)[+*]/.test(pattern)) {
    return false;
  }

  return true;
}
