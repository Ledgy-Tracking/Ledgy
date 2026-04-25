/**
 * Validate a regex pattern to prevent Regular Expression Denial of Service (ReDoS)
 *
 * Enforces length limits and blocks known dangerous patterns (nested quantifiers).
 */
export function validateRegexPattern(pattern: string): boolean {
    if (!pattern) return true;

    // Length limit
    if (pattern.length > 250) {
        return false;
    }

    // Heuristic for blocking nested quantifiers, e.g., (a+)+
    if (/\([^)]*(?:\+|\*|\{\d+,?\d*\})[^)]*\)(?:\+|\*|\{\d+,?\d*\})/.test(pattern)) {
        return false;
    }

    try {
        new RegExp(pattern);
        return true;
    } catch {
        return false;
    }
}
