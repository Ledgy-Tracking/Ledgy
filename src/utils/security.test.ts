import { describe, it, expect } from 'vitest';
import { validateRegexPattern } from './security';

describe('validateRegexPattern', () => {
    it('returns valid for empty pattern', () => {
        expect(validateRegexPattern('')).toEqual({ isValid: true });
    });

    it('returns valid for standard patterns', () => {
        expect(validateRegexPattern('^[A-Z]+$')).toEqual({ isValid: true });
        expect(validateRegexPattern('[0-9]{4}')).toEqual({ isValid: true });
    });

    it('rejects patterns longer than 100 characters', () => {
        const longPattern = 'a'.repeat(101);
        expect(validateRegexPattern(longPattern)).toEqual({
            isValid: false,
            error: 'Pattern exceeds maximum length of 100 characters',
        });
    });

    it('rejects dangerous nested quantifiers', () => {
        expect(validateRegexPattern('(a+)+')).toEqual({
            isValid: false,
            error: 'Pattern contains potentially dangerous nested quantifiers',
        });
        expect(validateRegexPattern('(a*)*')).toEqual({
            isValid: false,
            error: 'Pattern contains potentially dangerous nested quantifiers',
        });
    });

    it('rejects invalid regex syntax', () => {
        expect(validateRegexPattern('[unclosed-bracket')).toEqual({
            isValid: false,
            error: 'Invalid RegEx pattern',
        });
    });
});
