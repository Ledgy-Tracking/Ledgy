import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataEdge } from '../src/features/nodeEditor/edges/DataEdge';

// Mock React Flow hooks and components
const mockGetNode = vi.fn();
vi.mock('@xyflow/react', () => ({
    getBezierPath: () => ['M0,0 C50,0 50,100 100,100', 50, 50],
    useReactFlow: () => ({
        getNode: mockGetNode,
    }),
}));

describe('DataEdge', () => {
    const defaultProps = {
        id: 'edge-1',
        source: 'node-source',
        target: 'node-target',
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        sourcePosition: 'right' as any,
        targetPosition: 'left' as any,
        sourceHandle: 'source-number-price',
        targetHandle: 'target-number-input',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the edge path', () => {
        const { container } = render(
            <svg>
                <DataEdge {...defaultProps} />
            </svg>
        );
        expect(container.querySelector('path')).toBeInTheDocument();
    });

    it('shows tooltip with dynamic data on hover', async () => {
        // Mock source node with computation result
        mockGetNode.mockReturnValue({
            id: 'node-source',
            type: 'arithmetic',
            data: { result: 42.5 }
        });

        const { container } = render(
            <svg>
                <DataEdge {...defaultProps} />
            </svg>
        );

        const path = container.querySelector('path');
        if (!path) throw new Error('Path not found');

        fireEvent.mouseEnter(path);

        expect(screen.getByText('number flow')).toBeInTheDocument();
        expect(screen.getByText('42.5000')).toBeInTheDocument();
    });

    it('displays fallback message when no data is available', () => {
        mockGetNode.mockReturnValue({
            id: 'node-source',
            type: 'ledgerSource',
            data: {}
        });

        const { container } = render(
            <svg>
                <DataEdge {...defaultProps} />
            </svg>
        );

        const path = container.querySelector('path');
        if (!path) throw new Error('Path not found');

        fireEvent.mouseEnter(path);

        expect(screen.getByText('Live ledger stream')).toBeInTheDocument();
    });
});
