/**
 * Port type definitions and strict type compatibility validation
 * Story 4-8: Strict Edge Type Validation
 *
 * Port types established in stories 4-5 and 4-6
 */

export type PortType = 'number' | 'number[]' | 'text' | 'date' | 'boolean' | 'relation' | 'any';

export interface PortDefinition {
    id: string;
    name: string;
    type: PortType;
    required?: boolean;
    description?: string;
}

/**
 * Port type color mapping per UX specification
 */
export const portColorMap: Record<PortType, string> = {
    number: '#10b981',      // emerald-500
    'number[]': '#06b6d4',  // cyan-500 (arrays)
    text: '#3b82f6',        // blue-500
    date: '#f59e0b',        // amber-500
    relation: '#a855f7',    // purple-500
    boolean: '#a855f7',     // purple-500
    any: '#a1a1aa',         // zinc-400
};

/**
 * Get Tailwind class for port color
 */
export const getPortColorClass = (type: PortType | string): string => {
    const colorMap: Record<string, string> = {
        number: 'bg-emerald-500',
        'number[]': 'bg-cyan-500',
        text: 'bg-blue-500',
        date: 'bg-amber-500',
        relation: 'bg-purple-500',
        boolean: 'bg-purple-500',
        any: 'bg-zinc-400',
    };
    return colorMap[type] || 'bg-zinc-500';
};

/**
 * STRICT Type Compatibility Matrix for Edge Connection Validation
 * Story 4-8 AC1: Type Compatibility Matrix Implementation
 *
 * Rules:
 * - number → number[] is allowed (coercion: wraps in array)
 * - number[] → number is allowed (coercion: takes first element)
 * - No implicit conversion for other types (text NEVER → number, etc.)
 * - 'any' type accepts all types
 *
 * Source Type -> Valid Target Types
 */
export const compatibilityMatrix: Record<PortType, PortType[]> = {
    // Single number can connect to: number, number[], any
    number: ['number', 'number[]', 'any'],

    // Number array can connect to: number[] and any (strict - no coercion to single number)
    'number[]': ['number[]', 'any'],

    // Text fields only connect to text inputs
    text: ['text', 'any'],

    // Date fields only connect to date inputs
    date: ['date', 'any'],

    // Boolean fields only connect to boolean inputs
    boolean: ['boolean', 'any'],

    // Relation fields only connect to relation inputs
    relation: ['relation', 'any'],

    // 'any' type accepts any connection
    any: ['number', 'number[]', 'text', 'date', 'boolean', 'relation', 'any'],
};

/**
 * Type Coercion Rules (Validation Layer)
 *
 * IMPORTANT: Validation ONLY checks compatibility — actual data coercion happens
 * in the data processing layer (Story 4-10+).
 *
 * | Source → Target | Validation Behavior |
 * |-----------------|--------------------|
 * | number → number[] | Connection allowed |
 * | number[] → number | Connection allowed |
 */
export interface TypeCoercionInfo {
    applied: boolean;
    type?: 'wrap_array' | 'unwrap_array';
}

/**
 * Check if two types are compatible for connection
 * Implements strict type validation per Story 4-8 AC1
 *
 * @param sourceType - The output type from source handle
 * @param targetType - The input type of target handle
 * @returns true if connection is allowed, false otherwise
 */
export const isTypeCompatible = (
    sourceType: PortType | string | null | undefined,
    targetType: PortType | string | null | undefined
): boolean => {
    // Handle null/undefined cases - reject gracefully
    if (!sourceType || !targetType) return false;

    // Normalize types
    const normalizedSource = sourceType as PortType;
    const normalizedTarget = targetType as PortType;

    // Same type is always compatible
    if (normalizedSource === normalizedTarget) return true;

    // 'any' type accepts everything (as target)
    if (normalizedTarget === 'any') return true;

    // Check compatibility matrix
    const validTargets = compatibilityMatrix[normalizedSource];
    if (!validTargets) {
        // Unknown source type - log in development
        if (process.env.NODE_ENV === 'development') {
            console.warn('[EdgeValidation] Unknown source type:', sourceType);
        }
        return false;
    }

    return validTargets.includes(normalizedTarget);
};

/**
 * Get detailed compatibility result with coercion info
 */
export interface CompatibilityResult {
    compatible: boolean;
    sourceType: PortType | string;
    targetType: PortType | string;
    coercion?: TypeCoercionInfo;
    reason?: string;
}

/**
 * Detailed type compatibility check with full result info
 */
export const checkTypeCompatibility = (
    sourceType: PortType | string | null | undefined,
    targetType: PortType | string | null | undefined
): CompatibilityResult => {
    const result: CompatibilityResult = {
        compatible: false,
        sourceType: sourceType || 'unknown',
        targetType: targetType || 'unknown',
    };

    if (!sourceType || !targetType) {
        result.reason = 'missing_type';
        return result;
    }

    const normalizedSource = sourceType as PortType;
    const normalizedTarget = targetType as PortType;

    // Check coercion scenarios
    if (normalizedSource === 'number' && normalizedTarget === 'number[]') {
        result.compatible = true;
        result.coercion = { applied: true, type: 'wrap_array' };
        return result;
    }

    if (normalizedSource === 'number[]' && normalizedTarget === 'number') {
        result.compatible = true;
        result.coercion = { applied: true, type: 'unwrap_array' };
        return result;
    }

    // Standard compatibility check
    result.compatible = isTypeCompatible(sourceType, targetType);
    result.reason = result.compatible ? 'compatible' : 'type_mismatch';

    return result;
};

/**
 * Get human-readable type name for error messages
 */
export const getTypeDisplayName = (type: PortType | string): string => {
    const typeNames: Record<string, string> = {
        number: 'Number',
        'number[]': 'Number Array',
        text: 'Text',
        date: 'Date',
        relation: 'Relation',
        boolean: 'Boolean',
        any: 'Any',
    };
    return typeNames[type] || String(type);
};

/**
 * Get error message for incompatible types
 */
export const getConnectionError = (sourceType: PortType | string, targetType: PortType | string): string => {
    if (isTypeCompatible(sourceType, targetType)) return '';

    const sourceName = getTypeDisplayName(sourceType);
    const targetName = getTypeDisplayName(targetType);

    return `Cannot connect ${sourceName} to ${targetName}. These types are incompatible.`;
};

/**
 * Get suggested valid connection types for a source type
 */
export const getValidTargetTypes = (sourceType: PortType | string): PortType[] => {
    const normalizedSource = sourceType as PortType;
    return compatibilityMatrix[normalizedSource] || [];
};
