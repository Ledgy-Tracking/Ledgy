import { describe, it, expect } from 'vitest';
import { validateRegexPattern } from './security';

describe('validateRegexPattern', () => {
    it('allows valid simple regex', () => {
        expect(validateRegexPattern('^[A-Z]')).toBe(true);
        expect(validateRegexPattern('[0-9]+')).toBe(true);
    });

    it('blocks excessively long patterns', () => {
        expect(validateRegexPattern('A'.repeat(251))).toBe(false);
    });

    it('blocks nested quantifiers', () => {
        expect(validateRegexPattern('(a+)+')).toBe(false);
        expect(validateRegexPattern('(a*)*')).toBe(false);
    });

    it('blocks invalid regex', () => {
        expect(validateRegexPattern('[A-Z')).toBe(false);
    });
});
