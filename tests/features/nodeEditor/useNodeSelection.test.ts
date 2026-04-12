import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeSelection } from '../../../src/features/nodeEditor/hooks/useNodeSelection';
import * as ReactFlow from '@xyflow/react';

// Mock React Flow
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        useReactFlow: vi.fn(),
    };
});

describe('useNodeSelection', () => {
    const mockGetNodes = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (ReactFlow.useReactFlow as ReturnType<typeof vi.fn>).mockReturnValue({
            getNodes: mockGetNodes,
        });
    });

    it('should initialize with empty selection', () => {
        const { result } = renderHook(() => useNodeSelection());

        expect(result.current.selectedIds).toEqual([]);
        expect(result.current.selectionCount).toBe(0);
        expect(result.current.hasMultiSelection).toBe(false);
    });

    it('should update selection from React Flow', () => {
        const { result } = renderHook(() => useNodeSelection());

        act(() => {
            result.current.onSelectionChange({
                nodes: [
                    { id: '1', type: 'correlation', position: { x: 0, y: 0 }, data: {} },
                    { id: '2', type: 'correlation', position: { x: 100, y: 0 }, data: {} },
                ],
            });
        });

        expect(result.current.selectedIds).toEqual(['1', '2']);
        expect(result.current.selectionCount).toBe(2);
        expect(result.current.hasMultiSelection).toBe(true);
    });

    it('should select all nodes', () => {
        mockGetNodes.mockReturnValue([
            { id: '1', type: 'correlation', position: { x: 0, y: 0 }, data: {} },
            { id: '2', type: 'correlation', position: { x: 100, y: 0 }, data: {} },
            { id: '3', type: 'correlation', position: { x: 200, y: 0 }, data: {} },
        ]);

        const { result } = renderHook(() => useNodeSelection());

        act(() => {
            result.current.selectAll();
        });

        expect(result.current.selectedIds).toEqual(['1', '2', '3']);
        expect(result.current.selectionCount).toBe(3);
    });

    it('should clear selection', () => {
        const { result } = renderHook(() => useNodeSelection());

        act(() => {
            result.current.onSelectionChange({
                nodes: [{ id: '1', type: 'correlation', position: { x: 0, y: 0 }, data: {} }],
            });
        });

        expect(result.current.selectedIds).toEqual(['1']);

        act(() => {
            result.current.clearSelection();
        });

        expect(result.current.selectedIds).toEqual([]);
        expect(result.current.selectionCount).toBe(0);
    });

    it('should check if node is selected', () => {
        const { result } = renderHook(() => useNodeSelection());

        act(() => {
            result.current.onSelectionChange({
                nodes: [
                    { id: '1', type: 'correlation', position: { x: 0, y: 0 }, data: {} },
                ],
            });
        });

        expect(result.current.isSelected('1')).toBe(true);
        expect(result.current.isSelected('2')).toBe(false);
    });
});
