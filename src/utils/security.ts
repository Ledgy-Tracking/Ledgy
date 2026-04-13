/**
 * Security utilities
 */

/**
 * Validates a regular expression pattern to prevent ReDoS (Regular Expression Denial of Service).
 * Enforces a length limit and blocks dangerous nested quantifiers.
 */
export function validateRegexPattern(pattern: string): { isValid: boolean; error?: string } {
    if (!pattern) {
        return { isValid: true };
    }

    // Security: Enforce a strict length limit to prevent excessively long pattern processing
    if (pattern.length > 100) {
        return { isValid: false, error: 'Pattern exceeds maximum length of 100 characters' };
    }

    // Security: Heuristic to block dangerous nested quantifiers (e.g., (a+)+)
    // This is a common source of ReDoS vulnerabilities.
    const dangerousNestedQuantifiers = /\([^)]*?[*+{}].*?\)[*+{}]/;
    if (dangerousNestedQuantifiers.test(pattern)) {
        return { isValid: false, error: 'Pattern contains potentially dangerous nested quantifiers' };
    }

    // Finally, verify it can actually be compiled into a RegExp
    try {
        new RegExp(pattern);
        return { isValid: true };
    } catch {
        return { isValid: false, error: 'Invalid RegEx pattern' };
    }
}
