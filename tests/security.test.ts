import { describe, it, expect } from 'vitest';
import { validateRegexPattern } from '../src/utils/security';

describe('validateRegexPattern', () => {
    it('allows valid basic patterns', () => {
        expect(validateRegexPattern('^[A-Z]')).toBe(true);
        expect(validateRegexPattern('abc')).toBe(true);
    });

    it('rejects nested quantifiers causing ReDoS', () => {
        expect(validateRegexPattern('(a+)+')).toBe(false);
        expect(validateRegexPattern('([a-z]+)*')).toBe(false);
    });

    it('rejects patterns that exceed the 250 character limit', () => {
        const longPattern = 'a'.repeat(251);
        expect(validateRegexPattern(longPattern)).toBe(false);
    });

    it('rejects invalid regex syntax', () => {
        expect(validateRegexPattern('[unclosed')).toBe(false);
    });
});
