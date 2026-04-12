/**
 * Unit tests for Bezier path calculations
 * Story 4-7: Complex Edge Connection Snapping (AC3)
 */

import { describe, it, expect } from 'vitest';
import {
    getConnectionPath,
    getBezierControlPoints,
    getQuadraticPath,
    getStraightPath
} from './bezierPath';
import type { XYPosition } from '@xyflow/react';

describe('bezierPath', () => {
    describe('getBezierControlPoints', () => {
        it('should calculate control points for right-facing source', () => {
            const source: XYPosition = { x: 100, y: 100 };
            const target: XYPosition = { x: 300, y: 200 };

            const result = getBezierControlPoints(source, target, 'right');

            expect(result.sourceControl).toEqual({ x: 180, y: 100 }); // +80 offset
            expect(result.targetControl).toEqual({ x: 220, y: 200 }); // -80 offset
        });

        it('should calculate control points for left-facing source', () => {
            const source: XYPosition = { x: 300, y: 100 };
            const target: XYPosition = { x: 100, y: 200 };

            const result = getBezierControlPoints(source, target, 'left');

            expect(result.sourceControl).toEqual({ x: 220, y: 100 }); // -80 offset (left)
            expect(result.targetControl).toEqual({ x: 180, y: 200 }); // +80 offset (toward source)
        });

        it('should calculate control points for top-facing source', () => {
            const source: XYPosition = { x: 100, y: 200 };
            const target: XYPosition = { x: 300, y: 100 };

            const result = getBezierControlPoints(source, target, 'top');

            expect(result.sourceControl).toEqual({ x: 100, y: 120 }); // -80 offset
            expect(result.targetControl).toEqual({ x: 220, y: 100 }); // -80 offset
        });

        it('should calculate control points for bottom-facing source', () => {
            const source: XYPosition = { x: 100, y: 100 };
            const target: XYPosition = { x: 300, y: 200 };

            const result = getBezierControlPoints(source, target, 'bottom');

            expect(result.sourceControl).toEqual({ x: 100, y: 180 }); // +80 offset
            expect(result.targetControl).toEqual({ x: 220, y: 200 }); // -80 offset
        });

        it('should default to right direction', () => {
            const source: XYPosition = { x: 100, y: 100 };
            const target: XYPosition = { x: 300, y: 200 };

            const result = getBezierControlPoints(source, target);

            expect(result.sourceControl).toEqual({ x: 180, y: 100 });
        });
    });

    describe('getConnectionPath', () => {
        it('should generate valid SVG path string', () => {
            const source: XYPosition = { x: 100, y: 100 };
            const target: XYPosition = { x: 300, y: 200 };

            const path = getConnectionPath(source, target, 'right');

            expect(path).toContain('M 100 100');
            expect(path).toContain('C');
            expect(path).toContain('300 200');
        });

        it('should generate different paths for different directions', () => {
            const source: XYPosition = { x: 100, y: 100 };
            const target: XYPosition = { x: 300, y: 200 };

            const rightPath = getConnectionPath(source, target, 'right');
            const leftPath = getConnectionPath(source, target, 'left');
            const topPath = getConnectionPath(source, target, 'top');
            const bottomPath = getConnectionPath(source, target, 'bottom');

            expect(rightPath).not.toBe(leftPath);
            expect(rightPath).not.toBe(topPath);
            expect(rightPath).not.toBe(bottomPath);
        });

        it('should handle horizontal connection', () => {
            const source: XYPosition = { x: 0, y: 100 };
            const target: XYPosition = { x: 200, y: 100 };

            const path = getConnectionPath(source, target, 'right');

            expect(path).toBe('M 0 100 C 80 100, 120 100, 200 100');
        });

        it('should handle vertical connection', () => {
            const source: XYPosition = { x: 100, y: 0 };
            const target: XYPosition = { x: 100, y: 200 };

            const path = getConnectionPath(source, target, 'right');

            expect(path).toBe('M 100 0 C 180 0, 20 200, 100 200');
        });
    });

    describe('getQuadraticPath', () => {
        it('should generate quadratic Bezier path', () => {
            const source: XYPosition = { x: 0, y: 0 };
            const target: XYPosition = { x: 200, y: 200 };

            const path = getQuadraticPath(source, target);

            expect(path).toContain('M 0 0');
            expect(path).toContain('Q');
            expect(path).toContain('200 200');
        });

        it('should have control point at midpoint x', () => {
            const source: XYPosition = { x: 0, y: 0 };
            const target: XYPosition = { x: 200, y: 100 };

            const path = getQuadraticPath(source, target);

            expect(path).toBe('M 0 0 Q 100 0, 200 100');
        });
    });

    describe('getStraightPath', () => {
        it('should generate straight line path', () => {
            const source: XYPosition = { x: 0, y: 0 };
            const target: XYPosition = { x: 100, y: 100 };

            const path = getStraightPath(source, target);

            expect(path).toBe('M 0 0 L 100 100');
        });

        it('should handle negative coordinates', () => {
            const source: XYPosition = { x: -50, y: -50 };
            const target: XYPosition = { x: 50, y: 50 };

            const path = getStraightPath(source, target);

            expect(path).toBe('M -50 -50 L 50 50');
        });
    });
});
