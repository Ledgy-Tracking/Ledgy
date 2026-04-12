/**
 * Bezier curve calculations for connection lines
 * Story 4-7: Complex Edge Connection Snapping (AC3)
 */

import type { XYPosition } from '@xyflow/react';
import type { BezierControlPoints } from '../types/connection';

/**
 * Control point offset for Bezier curves (80px as per AC3 spec)
 */
const CONTROL_POINT_OFFSET = 80;

/**
 * Generate cubic Bezier curve path for connection line
 * 
 * @param sourcePos - Source handle position
 * @param targetPos - Target/cursor position
 * @param sourceDirection - Direction the source handle faces (defaults to 'right')
 * @returns SVG path string
 */
export const getConnectionPath = (
    sourcePos: XYPosition,
    targetPos: XYPosition,
    sourceDirection: 'left' | 'right' | 'top' | 'bottom' = 'right'
): string => {
    const controlPoints = getBezierControlPoints(sourcePos, targetPos, sourceDirection);
    
    return `M ${sourcePos.x} ${sourcePos.y} ` +
           `C ${controlPoints.sourceControl.x} ${controlPoints.sourceControl.y}, ` +
           `${controlPoints.targetControl.x} ${controlPoints.targetControl.y}, ` +
           `${targetPos.x} ${targetPos.y}`;
};

/**
 * Calculate Bezier control points for smooth curves
 * 
 * @param sourcePos - Source handle position
 * @param targetPos - Target/cursor position
 * @param sourceDirection - Direction the source handle faces
 * @returns Control points for the Bezier curve
 */
export const getBezierControlPoints = (
    sourcePos: XYPosition,
    targetPos: XYPosition,
    sourceDirection: 'left' | 'right' | 'top' | 'bottom' = 'right'
): BezierControlPoints => {
    const offset = CONTROL_POINT_OFFSET;
    
    // Source control point extends perpendicular from source handle
    let sourceControl: XYPosition;
    switch (sourceDirection) {
        case 'left':
            sourceControl = { x: sourcePos.x - offset, y: sourcePos.y };
            break;
        case 'right':
            sourceControl = { x: sourcePos.x + offset, y: sourcePos.y };
            break;
        case 'top':
            sourceControl = { x: sourcePos.x, y: sourcePos.y - offset };
            break;
        case 'bottom':
            sourceControl = { x: sourcePos.x, y: sourcePos.y + offset };
            break;
        default:
            sourceControl = { x: sourcePos.x + offset, y: sourcePos.y };
    }
    
    // Target control point extends from target toward the source
    // Calculate direction based on relative positions
    const isSourceToRight = sourcePos.x > targetPos.x;
    const targetControl: XYPosition = {
        x: isSourceToRight ? targetPos.x + offset : targetPos.x - offset,
        y: targetPos.y
    };

    return { sourceControl, targetControl };
};

/**
 * Calculate simple quadratic Bezier path (fallback)
 * Used for simpler animations or when performance is critical
 */
export const getQuadraticPath = (
    sourcePos: XYPosition,
    targetPos: XYPosition
): string => {
    const midX = (sourcePos.x + targetPos.x) / 2;
    const controlPoint = { x: midX, y: sourcePos.y };
    
    return `M ${sourcePos.x} ${sourcePos.y} ` +
           `Q ${controlPoint.x} ${controlPoint.y}, ${targetPos.x} ${targetPos.y}`;
};

/**
 * Calculate straight line path (for comparison/debugging)
 */
export const getStraightPath = (
    sourcePos: XYPosition,
    targetPos: XYPosition
): string => {
    return `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`;
};
