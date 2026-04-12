/**
 * Unit tests for snap detection utilities
 * Story 4-7: Complex Edge Connection Snapping
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    HandleSpatialIndex,
    detectSnap,
    detectSnapWithHysteresis,
    getDistance,
    filterHandlesByViewport,
    SNAP_RADIUS,
    RELEASE_RADIUS,
    TOUCH_SNAP_RADIUS
} from './snapDetection';
import type { HandlePosition } from '../types/connection';
import type { XYPosition } from '@xyflow/react';

describe('snapDetection', () => {
    describe('getDistance', () => {
        it('should calculate Euclidean distance correctly', () => {
            const a: XYPosition = { x: 0, y: 0 };
            const b: XYPosition = { x: 3, y: 4 };
            expect(getDistance(a, b)).toBe(5);
        });

        it('should return 0 for identical points', () => {
            const a: XYPosition = { x: 10, y: 10 };
            const b: XYPosition = { x: 10, y: 10 };
            expect(getDistance(a, b)).toBe(0);
        });

        it('should handle negative coordinates', () => {
            const a: XYPosition = { x: -3, y: -4 };
            const b: XYPosition = { x: 0, y: 0 };
            expect(getDistance(a, b)).toBe(5);
        });
    });

    describe('HandleSpatialIndex', () => {
        let index: HandleSpatialIndex;

        beforeEach(() => {
            index = new HandleSpatialIndex({
                x: 0,
                y: 0,
                width: 1000,
                height: 1000
            });
        });

        it('should insert and retrieve handles', () => {
            const handle: HandlePosition = {
                id: 'handle1',
                nodeId: 'node1',
                x: 100,
                y: 100,
                type: 'number',
                direction: 'output'
            };

            index.insert(handle);
            const results = index.queryRange({ x: 100, y: 100 }, 50);

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('handle1');
        });

        it('should not return handles outside query range', () => {
            const handle: HandlePosition = {
                id: 'handle1',
                nodeId: 'node1',
                x: 500,
                y: 500,
                type: 'number',
                direction: 'output'
            };

            index.insert(handle);
            const results = index.queryRange({ x: 100, y: 100 }, 50);

            expect(results).toHaveLength(0);
        });

        it('should return all handles when queried with large range', () => {
            const handles: HandlePosition[] = [
                { id: 'h1', nodeId: 'n1', x: 100, y: 100, type: 'number', direction: 'output' },
                { id: 'h2', nodeId: 'n2', x: 200, y: 200, type: 'text', direction: 'input' },
                { id: 'h3', nodeId: 'n3', x: 300, y: 300, type: 'boolean', direction: 'output' }
            ];

            handles.forEach(h => index.insert(h));
            const results = index.queryRange({ x: 200, y: 200 }, 500);

            expect(results).toHaveLength(3);
        });

        it('should get all handles', () => {
            const handles: HandlePosition[] = [
                { id: 'h1', nodeId: 'n1', x: 100, y: 100, type: 'number', direction: 'output' },
                { id: 'h2', nodeId: 'n2', x: 200, y: 200, type: 'text', direction: 'input' }
            ];

            handles.forEach(h => index.insert(h));
            const allHandles = index.getAllHandles();

            expect(allHandles).toHaveLength(2);
        });
    });

    describe('detectSnap', () => {
        const handles: HandlePosition[] = [
            { id: 'h1', nodeId: 'n1', x: 100, y: 100, type: 'number', direction: 'output' },
            { id: 'h2', nodeId: 'n2', x: 200, y: 100, type: 'text', direction: 'input' },
            { id: 'h3', nodeId: 'n3', x: 150, y: 150, type: 'number', direction: 'input' }
        ];

        it('should snap when cursor is within SNAP_RADIUS', () => {
            const cursor: XYPosition = { x: 110, y: 100 }; // 10px from h1
            const result = detectSnap(cursor, handles);

            expect(result.snapped).toBe(true);
            expect(result.handleId).toBe('h1');
            expect(result.position).toEqual({ x: 100, y: 100 });
        });

        it('should not snap when cursor is outside SNAP_RADIUS', () => {
            const cursor: XYPosition = { x: 150, y: 100 }; // 50px from h1
            const result = detectSnap(cursor, handles);

            expect(result.snapped).toBe(false);
            expect(result.position).toEqual(cursor);
        });

        it('should snap to nearest handle when multiple are in range', () => {
            // Position within snap radius of h1 (at 100,100) - distance ~14px
            // Also within range if h3 were closer, but h3 at (150,150) is ~49px away
            const cursor: XYPosition = { x: 110, y: 110 };
            const result = detectSnap(cursor, handles);

            expect(result.snapped).toBe(true);
            expect(result.handleId).toBe('h1'); // h1 is closest at ~14px
        });

        it('should validate type compatibility when source type provided', () => {
            const cursor: XYPosition = { x: 110, y: 100 };
            const result = detectSnap(cursor, handles, 'number');

            expect(result.snapped).toBe(true);
            expect(result.isValid).toBe(true); // number -> number is compatible
        });

        it('should mark incompatible types as invalid', () => {
            const cursor: XYPosition = { x: 210, y: 100 }; // Near h2 (text type)
            const result = detectSnap(cursor, handles, 'number');

            expect(result.snapped).toBe(true);
            expect(result.isValid).toBe(false); // number -> text is incompatible
        });

        it('should use larger radius for touch interactions', () => {
            const cursor: XYPosition = { x: 130, y: 100 }; // 30px from h1
            
            // Regular snap - too far
            const regularResult = detectSnap(cursor, handles, undefined, false);
            expect(regularResult.snapped).toBe(false);

            // Touch snap - within TOUCH_SNAP_RADIUS (32px)
            const touchResult = detectSnap(cursor, handles, undefined, true);
            expect(touchResult.snapped).toBe(true);
        });
    });

    describe('detectSnapWithHysteresis', () => {
        const handles: HandlePosition[] = [
            { id: 'h1', nodeId: 'n1', x: 100, y: 100, type: 'number', direction: 'output' }
        ];

        it('should maintain snap when cursor moves within RELEASE_RADIUS', () => {
            const initialSnap = detectSnap({ x: 110, y: 100 }, handles);
            expect(initialSnap.snapped).toBe(true);

            // Move to 30px away (within RELEASE_RADIUS of 36px)
            const cursor: XYPosition = { x: 130, y: 100 };
            const result = detectSnapWithHysteresis(cursor, handles, initialSnap);

            expect(result.snapped).toBe(true);
            expect(result.handleId).toBe('h1');
        });

        it('should release snap when cursor moves beyond RELEASE_RADIUS', () => {
            const initialSnap = detectSnap({ x: 110, y: 100 }, handles);
            expect(initialSnap.snapped).toBe(true);

            // Move to 40px away (beyond RELEASE_RADIUS of 36px)
            const cursor: XYPosition = { x: 140, y: 100 };
            const result = detectSnapWithHysteresis(cursor, handles, initialSnap);

            expect(result.snapped).toBe(false);
        });

        it('should detect new snap after release', () => {
            const initialSnap = detectSnap({ x: 110, y: 100 }, handles);
            
            // Move far away to release
            const farCursor: XYPosition = { x: 200, y: 100 };
            const released = detectSnapWithHysteresis(farCursor, handles, initialSnap);
            expect(released.snapped).toBe(false);

            // Move to another snap zone
            const newHandles: HandlePosition[] = [
                { id: 'h2', nodeId: 'n2', x: 200, y: 100, type: 'number', direction: 'input' }
            ];
            const newCursor: XYPosition = { x: 210, y: 100 };
            const newSnap = detectSnapWithHysteresis(newCursor, newHandles, released);
            
            expect(newSnap.snapped).toBe(true);
            expect(newSnap.handleId).toBe('h2');
        });
    });

    describe('filterHandlesByViewport', () => {
        const handles: HandlePosition[] = [
            { id: 'h1', nodeId: 'n1', x: 100, y: 100, type: 'number', direction: 'output' },
            { id: 'h2', nodeId: 'n2', x: 500, y: 500, type: 'text', direction: 'input' },
            { id: 'h3', nodeId: 'n3', x: 1000, y: 1000, type: 'boolean', direction: 'output' }
        ];

        it('should return handles within viewport', () => {
            const viewport = { x: 0, y: 0, zoom: 1 };
            const canvasSize = { width: 600, height: 600 };

            const result = filterHandlesByViewport(handles, viewport, canvasSize);

            expect(result).toHaveLength(2);
            expect(result.map(h => h.id)).toContain('h1');
            expect(result.map(h => h.id)).toContain('h2');
            expect(result.map(h => h.id)).not.toContain('h3');
        });

        it('should account for zoom level', () => {
            const viewport = { x: 0, y: 0, zoom: 2 };
            const canvasSize = { width: 600, height: 600 };

            const result = filterHandlesByViewport(handles, viewport, canvasSize);

            // At zoom 2, visible area is smaller
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('h1');
        });

        it('should account for viewport offset', () => {
            const viewport = { x: -400, y: -400, zoom: 1 };
            const canvasSize = { width: 600, height: 600 };

            const result = filterHandlesByViewport(handles, viewport, canvasSize);

            // Viewport panned to show h2 and h3
            expect(result.map(h => h.id)).toContain('h2');
            expect(result.map(h => h.id)).toContain('h3');
        });

        it('should include padding around viewport', () => {
            const viewport = { x: 0, y: 0, zoom: 1 };
            const canvasSize = { width: 400, height: 400 };

            // h2 at 500,500 is outside 400x400 viewport but within 100px padding
            const result = filterHandlesByViewport(handles, viewport, canvasSize, 100);

            expect(result.map(h => h.id)).toContain('h2');
        });
    });

    describe('constants', () => {
        it('should have correct snap radius values', () => {
            expect(SNAP_RADIUS).toBe(24);
            expect(RELEASE_RADIUS).toBe(36);
            expect(TOUCH_SNAP_RADIUS).toBe(32);
        });

        it('should have RELEASE_RADIUS as 1.5x SNAP_RADIUS', () => {
            expect(RELEASE_RADIUS).toBe(SNAP_RADIUS * 1.5);
        });
    });
});
