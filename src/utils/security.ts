/**
 * Validates a regex pattern string to prevent ReDoS (Regular Expression Denial of Service)
 * vulnerabilities.
 *
 * Enforces a maximum length and uses heuristics to block dangerous nested quantifiers
 * (e.g., `(a+)+` or `([a-z]+)*`) which can lead to exponential backtracking and crash
 * the application or exhaust memory.
 *
 * @param pattern The regex source string to validate
 * @returns boolean indicating if the pattern is safe
 */
export function validateRegexPattern(pattern: string): boolean {
    // 1. Enforce a hard length limit
    if (pattern.length > 250) {
        return false;
    }

    // 2. Detect dangerous nested quantifiers
    // This heuristic looks for an unescaped group containing an unescaped quantifier
    // which is immediately followed by another unescaped quantifier.
    // e.g., (a+)+ or ([a-z]+)*
    const dangerousNested = /(?<!\\)\([^)\\]*(?:\\.[^)\\]*)*(?<!\\)(?:[+*]|\{\d+(?:,\d*)?\})[^)\\]*(?:\\.[^)\\]*)*\)\s*(?<!\\)(?:[+*]|\{\d+(?:,\d*)?\})/;

    if (dangerousNested.test(pattern)) {
        return false;
    }

    return true;
}
