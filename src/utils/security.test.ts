import { validateRegexPattern } from './security';
import { describe, it, expect } from 'vitest';

describe('security utils', () => {
    describe('validateRegexPattern', () => {
        it('allows valid regex patterns', () => {
            expect(() => validateRegexPattern('^[a-z]+$')).not.toThrow();
        });

        it('throws on overly long patterns', () => {
            const longPattern = 'a'.repeat(251);
            expect(() => validateRegexPattern(longPattern)).toThrow('Regex pattern exceeds 250 characters');
        });

        it('throws on dangerous nested quantifiers', () => {
            expect(() => validateRegexPattern('(a+)+')).toThrow('Potentially dangerous nested quantifiers detected in regex pattern');
            expect(() => validateRegexPattern('(a*)*')).toThrow('Potentially dangerous nested quantifiers detected in regex pattern');
            expect(() => validateRegexPattern('(a+)*')).toThrow('Potentially dangerous nested quantifiers detected in regex pattern');
            expect(() => validateRegexPattern('(a*)+')).toThrow('Potentially dangerous nested quantifiers detected in regex pattern');
        });

        it('allows valid lazy quantifiers', () => {
            expect(() => validateRegexPattern('a+?')).not.toThrow();
            expect(() => validateRegexPattern('a*?')).not.toThrow();
            expect(() => validateRegexPattern('(a+)?')).not.toThrow();
        });

        it('throws if regex does not compile', () => {
            expect(() => validateRegexPattern('[a-z')).toThrow(SyntaxError);
        });
    });
});
