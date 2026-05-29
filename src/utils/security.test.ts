import { describe, it, expect } from 'vitest';
import { validateRegexPattern } from './security';

describe('validateRegexPattern', () => {
    it('returns null for valid, safe patterns', () => {
        expect(validateRegexPattern('^[A-Z]')).toBeNull();
        expect(validateRegexPattern('a+b*')).toBeNull();
        expect(validateRegexPattern('[0-9]{3}-[0-9]{2}-[0-9]{4}')).toBeNull();
    });

    it('returns error for overly long patterns', () => {
        const longPattern = 'a'.repeat(251);
        expect(validateRegexPattern(longPattern)).toBe('Regex pattern exceeds maximum length of 250 characters');
    });

    it('returns error for potentially dangerous nested quantifiers', () => {
        expect(validateRegexPattern('(a+)+')).toBe('Regex pattern contains potentially dangerous nested quantifiers');
        expect(validateRegexPattern('(a*)*')).toBe('Regex pattern contains potentially dangerous nested quantifiers');
        expect(validateRegexPattern('([a-z]+)*')).toBe('Regex pattern contains potentially dangerous nested quantifiers');
        expect(validateRegexPattern('(a+?)+')).toBe('Regex pattern contains potentially dangerous nested quantifiers');
    });

    it('returns error for invalid regex syntax', () => {
        expect(validateRegexPattern('[a-z')).toBe('Invalid RegEx pattern');
        expect(validateRegexPattern('a**')).toBe('Invalid RegEx pattern');
    });
});
