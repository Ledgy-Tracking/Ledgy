export function validateRegexPattern(pattern: string): boolean {
    if (!pattern) return true;

    // Hard limit on regex length to prevent parsing DoS
    if (pattern.length > 250) {
        throw new Error('Regex pattern exceeds maximum length of 250 characters');
    }

    // Heuristic: check for nested quantifiers which often cause ReDoS.
    // This specifically targets patterns like `(a+)+` while avoiding false
    // positives on literal quantifiers inside classes `[+]` or escaped ones `\++`.
    const nestedGroupQuantifier = /(?<!\\)(?:\\\\)*(?:\+|\*|\{\d+(?:,\d*)?\})\s*\)\s*(?:\+|\*|\{\d+(?:,\d*)?\})/;
    if (nestedGroupQuantifier.test(pattern)) {
        throw new Error('Pattern contains nested quantifiers which can cause ReDoS');
    }

    // Validate it compiles
    new RegExp(pattern);

    return true;
}
