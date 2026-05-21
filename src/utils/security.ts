/**
 * Security utilities
 */

/**
 * Validates a regular expression pattern string to prevent ReDoS (Regular Expression Denial of Service).
 *
 * Enforces a maximum length and uses heuristics to block patterns that could cause exponential backtracking.
 *
 * @param pattern The regular expression pattern string to validate
 * @returns true if the pattern is safe and valid, false otherwise
 */
export function validateRegexPattern(pattern: string): boolean {
    if (typeof pattern !== 'string') return false;

    // 1. Length constraint (250 chars)
    if (pattern.length > 250) return false;

    // 2. Heuristic for exponential time regex: nested quantifiers
    // This catches patterns like (a+)+, (a*)*, ([a-z]+)* which are common ReDoS vectors
    // It avoids false positives on non-nested lazy quantifiers like *? or +?
    const dangerousNested = /\([^)]*?[*+?](?:[^)]*)\)[*+?]/;
    if (dangerousNested.test(pattern)) return false;

    // 3. Heuristic for large repetitions which can cause memory exhaustion or CPU spikes
    const dangerousRepetition = /\{\d{3,}\}/;
    if (dangerousRepetition.test(pattern)) return false;

    // 4. Validate that it's actually a valid regex
    try {
        new RegExp(pattern);
        return true;
    } catch {
        return false;
    }
}
