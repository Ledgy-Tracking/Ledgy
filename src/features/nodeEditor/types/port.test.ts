import { describe, it, expect } from 'vitest';
import {
    isTypeCompatible,
    checkTypeCompatibility,
    getTypeDisplayName,
    getConnectionError,
    getValidTargetTypes,
    compatibilityMatrix,
} from './port';
import type { PortType } from './port';

describe('port type system', () => {
    describe('isTypeCompatible', () => {
        // AC1: Same type compatibility
        it('should allow same type connections', () => {
            const types: PortType[] = ['number', 'number[]', 'text', 'date', 'boolean', 'relation', 'any'];
            for (const type of types) {
                expect(isTypeCompatible(type, type)).toBe(true);
            }
        });

        // AC1: Type coercion - number to number[]
        it('should allow number to number[] coercion', () => {
            expect(isTypeCompatible('number', 'number[]')).toBe(true);
        });

        // AC1: Type coercion - number[] to number (allowed - takes first element)
        it('should allow number[] to number coercion', () => {
            expect(isTypeCompatible('number[]', 'number')).toBe(true);
        });

        // AC1: any type accepts all types
        it('should allow any type as target', () => {
            const types: PortType[] = ['number', 'number[]', 'text', 'date', 'boolean', 'relation'];
            for (const type of types) {
                expect(isTypeCompatible(type, 'any')).toBe(true);
            }
        });

        // AC1: any type can connect to all types
        it('should allow any type as source', () => {
            const types: PortType[] = ['number', 'number[]', 'text', 'date', 'boolean', 'relation', 'any'];
            for (const type of types) {
                expect(isTypeCompatible('any', type)).toBe(true);
            }
        });

        // AC1: Strict type enforcement - text NEVER to number
        it('should reject text to number', () => {
            expect(isTypeCompatible('text', 'number')).toBe(false);
        });

        it('should reject text to number[]', () => {
            expect(isTypeCompatible('text', 'number[]')).toBe(false);
        });

        // AC1: Strict type enforcement - date NEVER to text
        it('should reject date to text', () => {
            expect(isTypeCompatible('date', 'text')).toBe(false);
        });

        // AC1: Strict type enforcement - boolean NEVER to number
        it('should reject boolean to number', () => {
            expect(isTypeCompatible('boolean', 'number')).toBe(false);
        });

        it('should reject boolean to number[]', () => {
            expect(isTypeCompatible('boolean', 'number[]')).toBe(false);
        });

        // AC1: Type-specific connections
        it('should allow text to text', () => {
            expect(isTypeCompatible('text', 'text')).toBe(true);
        });

        it('should allow date to date', () => {
            expect(isTypeCompatible('date', 'date')).toBe(true);
        });

        it('should allow boolean to boolean', () => {
            expect(isTypeCompatible('boolean', 'boolean')).toBe(true);
        });

        it('should allow relation to relation', () => {
            expect(isTypeCompatible('relation', 'relation')).toBe(true);
        });

        // AC1: Incompatible type combinations
        it('should reject number to text', () => {
            expect(isTypeCompatible('number', 'text')).toBe(false);
        });

        it('should reject number to date', () => {
            expect(isTypeCompatible('number', 'date')).toBe(false);
        });

        it('should reject number to boolean', () => {
            expect(isTypeCompatible('number', 'boolean')).toBe(false);
        });

        it('should reject number to relation', () => {
            expect(isTypeCompatible('number', 'relation')).toBe(false);
        });

        it('should reject number[] to text', () => {
            expect(isTypeCompatible('number[]', 'text')).toBe(false);
        });

        it('should reject number[] to date', () => {
            expect(isTypeCompatible('number[]', 'date')).toBe(false);
        });

        it('should reject number[] to boolean', () => {
            expect(isTypeCompatible('number[]', 'boolean')).toBe(false);
        });

        it('should reject number[] to relation', () => {
            expect(isTypeCompatible('number[]', 'relation')).toBe(false);
        });

        // Null/undefined handling
        it('should reject null source type', () => {
            expect(isTypeCompatible(null, 'number')).toBe(false);
        });

        it('should reject undefined source type', () => {
            expect(isTypeCompatible(undefined, 'number')).toBe(false);
        });

        it('should reject null target type', () => {
            expect(isTypeCompatible('number', null)).toBe(false);
        });

        it('should reject undefined target type', () => {
            expect(isTypeCompatible('number', undefined)).toBe(false);
        });

        it('should reject both null types', () => {
            expect(isTypeCompatible(null, null)).toBe(false);
        });
    });

    describe('checkTypeCompatibility', () => {
        it('should return coercion info for number to number[]', () => {
            const result = checkTypeCompatibility('number', 'number[]');
            expect(result.compatible).toBe(true);
            expect(result.coercion?.applied).toBe(true);
            expect(result.coercion?.type).toBe('wrap_array');
        });

        it('should return coercion info for number[] to number', () => {
            const result = checkTypeCompatibility('number[]', 'number');
            expect(result.compatible).toBe(true);
            expect(result.coercion?.applied).toBe(true);
            expect(result.coercion?.type).toBe('unwrap_array');
        });

        it('should return no coercion for same type', () => {
            const result = checkTypeCompatibility('number', 'number');
            expect(result.compatible).toBe(true);
            expect(result.coercion?.applied).toBeFalsy();
        });

        it('should return reason for incompatible types', () => {
            const result = checkTypeCompatibility('text', 'number');
            expect(result.compatible).toBe(false);
            expect(result.reason).toBe('type_mismatch');
        });

        it('should return reason for missing types', () => {
            const result = checkTypeCompatibility(null, 'number');
            expect(result.compatible).toBe(false);
            expect(result.reason).toBe('missing_type');
        });
    });

    describe('getTypeDisplayName', () => {
        it('should return correct display names', () => {
            expect(getTypeDisplayName('number')).toBe('Number');
            expect(getTypeDisplayName('number[]')).toBe('Number Array');
            expect(getTypeDisplayName('text')).toBe('Text');
            expect(getTypeDisplayName('date')).toBe('Date');
            expect(getTypeDisplayName('relation')).toBe('Relation');
            expect(getTypeDisplayName('boolean')).toBe('Boolean');
            expect(getTypeDisplayName('any')).toBe('Any');
        });

        it('should return stringified unknown types', () => {
            expect(getTypeDisplayName('unknown')).toBe('unknown');
        });
    });

    describe('getConnectionError', () => {
        it('should return empty string for compatible types', () => {
            expect(getConnectionError('number', 'number')).toBe('');
        });

        it('should return error message for incompatible types', () => {
            const error = getConnectionError('text', 'number');
            expect(error).toContain('Text');
            expect(error).toContain('Number');
            expect(error).toContain('incompatible');
        });
    });

    describe('getValidTargetTypes', () => {
        it('should return valid targets for number', () => {
            const targets = getValidTargetTypes('number');
            expect(targets).toContain('number');
            expect(targets).toContain('number[]');
            expect(targets).toContain('any');
        });

        it('should return valid targets for text', () => {
            const targets = getValidTargetTypes('text');
            expect(targets).toContain('text');
            expect(targets).toContain('any');
            expect(targets).not.toContain('number');
        });

        it('should return empty array for unknown type', () => {
            const targets = getValidTargetTypes('unknown');
            expect(targets).toEqual([]);
        });
    });

    describe('compatibilityMatrix completeness', () => {
        it('should have entries for all port types', () => {
            const types: PortType[] = ['number', 'number[]', 'text', 'date', 'boolean', 'relation', 'any'];
            for (const type of types) {
                expect(compatibilityMatrix[type]).toBeDefined();
                expect(Array.isArray(compatibilityMatrix[type])).toBe(true);
            }
        });

        it('should include self-compatibility for all types', () => {
            const types: PortType[] = ['number', 'number[]', 'text', 'date', 'boolean', 'relation', 'any'];
            for (const type of types) {
                expect(compatibilityMatrix[type]).toContain(type);
            }
        });
    });
});
