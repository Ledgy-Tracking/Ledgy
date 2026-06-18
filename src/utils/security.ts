/**
 * Validates a user-provided regex pattern to prevent ReDoS vulnerabilities.
 * Enforces a 250-character length limit.
 * Blocks dangerous nested quantifiers (e.g., (a+)+, (a+)*) but allows lazy quantifiers (e.g., *?, +?).
 */
export function validateRegexPattern(pattern: string): void {
    if (pattern.length > 250) {
        throw new Error('Regex pattern exceeds 250 characters');
    }

    // Heuristic to detect dangerous nested quantifiers like (a+)+, (a+)*, (a*)+, (a*)*
    // The previous heuristic missed variations like (a+)*.
    // This heuristic focuses specifically on a group (containing a repetition operator without a trailing literal or boundary) followed by a repetition operator.
    if (/(\([^)]*[*+][^)]*\)[*+])/.test(pattern)) {
        throw new Error('Potentially dangerous nested quantifiers detected in regex pattern');
    }

    // Finally, verify it compiles correctly
    new RegExp(pattern);
}
