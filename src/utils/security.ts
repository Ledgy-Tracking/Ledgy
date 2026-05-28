export function validateRegexPattern(pattern: string): boolean {
    if (!pattern || pattern.length > 250) return false;

    // Heuristic to detect dangerous nested quantifiers (ReDoS)
    // E.g., (a+)+ or (a*)* or (a+)* etc.
    const dangerousPattern = /(\([^)]*(?:\+|\*|\{.+?\})[^)]*\)(?:\+|\*|\{.+?\}))/;
    if (dangerousPattern.test(pattern)) return false;

    // Also block extremely complex alternations or deeply nested groups as a precaution
    const depth = (pattern.match(/\(/g) || []).length;
    if (depth > 10) return false;

    try {
        new RegExp(pattern);
        return true;
    } catch {
        return false;
    }
}
