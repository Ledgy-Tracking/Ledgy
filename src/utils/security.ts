/**
 * Validates a regular expression pattern to prevent ReDoS (Regular Expression Denial of Service).
 * Enforces a maximum length and uses heuristics to detect potentially dangerous patterns
 * like nested quantifiers.
 */
export function validateRegexPattern(pattern: string): { isValid: boolean; error?: string } {
    if (!pattern) return { isValid: true };

    if (pattern.length > 250) {
        return { isValid: false, error: 'Pattern exceeds maximum length of 250 characters' };
    }

    // Heuristic for nested quantifiers e.g. (a+)+ or (a|a)+
    // Matches groups that contain repetition and are themselves repeated
    const dangerousNestedQuantifiers = /\([^)]*(?:\+|\*|\{\d+,?\d*\})\)[+*\{]/;
    if (dangerousNestedQuantifiers.test(pattern)) {
        return { isValid: false, error: 'Pattern contains potentially dangerous nested quantifiers' };
    }

    // Check for excessive alternations that might blow up
    const excessiveAlternations = /([^|]*\|){10,}/;
    if (excessiveAlternations.test(pattern)) {
        return { isValid: false, error: 'Pattern contains too many alternations' };
    }

    try {
        new RegExp(pattern);
        return { isValid: true };
    } catch (e) {
        return { isValid: false, error: 'Invalid regular expression syntax' };
    }
}
