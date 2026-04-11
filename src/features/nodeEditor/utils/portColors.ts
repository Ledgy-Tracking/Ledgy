/**
 * Port type color mapping for node handles
 * Story 4-8: Strict Edge Type Validation
 *
 * This file re-exports from the centralized port type system
 * for backward compatibility with existing code.
 */

// Re-export all port type definitions from the centralized type system
export {
    type PortType,
    type PortDefinition,
    type TypeCoercionInfo,
    type CompatibilityResult,
    portColorMap,
    getPortColorClass,
    compatibilityMatrix,
    isTypeCompatible,
    checkTypeCompatibility,
    getTypeDisplayName,
    getConnectionError,
    getValidTargetTypes,
} from '../types/port';
