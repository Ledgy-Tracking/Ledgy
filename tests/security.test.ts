import { describe, it, expect } from 'vitest';
import { validateRegexPattern } from '../src/utils/security';

describe('validateRegexPattern', () => {
    it('should allow valid simple patterns', () => {
        expect(() => validateRegexPattern('^[a-z]+$')).not.toThrow();
        expect(() => validateRegexPattern('[0-9]{4}')).not.toThrow();
    });

    it('should throw on patterns over 100 characters', () => {
        const longPattern = 'a'.repeat(101);
        expect(() => validateRegexPattern(longPattern)).toThrow(/exceeds maximum length/);
    });

    it('should throw on potentially dangerous nested quantifiers', () => {
        expect(() => validateRegexPattern('(a+)+')).toThrow(/potentially dangerous nested quantifiers/);
        expect(() => validateRegexPattern('(a*)*')).toThrow(/potentially dangerous nested quantifiers/);
        expect(() => validateRegexPattern('(a{1,2})+')).toThrow(/potentially dangerous nested quantifiers/);
        expect(() => validateRegexPattern('([a-zA-Z]+)*')).toThrow(/potentially dangerous nested quantifiers/);
    });

    it('should not throw on safe combinations of quantifiers', () => {
        expect(() => validateRegexPattern('a+')).not.toThrow();
        expect(() => validateRegexPattern('(a)+')).not.toThrow();
        expect(() => validateRegexPattern('(a)*')).not.toThrow();
        expect(() => validateRegexPattern('([a-z])+')).not.toThrow();
    });

    it('should throw on invalid regex syntax', () => {
        expect(() => validateRegexPattern('[a-z')).toThrow(/Invalid regex pattern/);
    });
});
