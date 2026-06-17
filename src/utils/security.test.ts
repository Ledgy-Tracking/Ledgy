import { describe, it, expect } from 'vitest';
import { validateRegexPattern } from './security';

describe('validateRegexPattern', () => {
    it('allows valid patterns', () => {
        expect(validateRegexPattern('^[A-Z]').isValid).toBe(true);
        expect(validateRegexPattern('[a-z]+@[a-z]+\\.[a-z]{2,}').isValid).toBe(true);
    });

    it('rejects overly long patterns', () => {
        const longPattern = 'a'.repeat(251);
        const result = validateRegexPattern(longPattern);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('maximum length');
    });

    it('rejects dangerous nested quantifiers', () => {
        expect(validateRegexPattern('(a+)+').isValid).toBe(false);
        expect(validateRegexPattern('([a-z]+)*').isValid).toBe(false);
        expect(validateRegexPattern('(a|b+)+').isValid).toBe(false);
    });

    it('rejects excessive alternations', () => {
        expect(validateRegexPattern('a|b|c|d|e|f|g|h|i|j|k').isValid).toBe(false);
    });

    it('rejects invalid syntax', () => {
        expect(validateRegexPattern('[').isValid).toBe(false);
        expect(validateRegexPattern('(').isValid).toBe(false);
    });
});
