import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorrelationNode } from '../src/features/nodeEditor/nodes/CorrelationNode';

// Mock React Flow components
vi.mock('@xyflow/react', () => ({
    Handle: ({ id, type }: any) => <div data-testid={`handle-${type}-${id}`} />,
    Position: { Right: 'right', Left: 'left' },
}));

describe('CorrelationNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        const data = { 
            label: 'Corr', 
            correlationType: 'pearson' as const,
            lastResult: { correlation: null, sampleSize: 0, computedAt: new Date().toISOString() },
            isComputing: false 
        };
        const { container } = render(<CorrelationNode id="node-1" data={data} selected={false} type="correlation" zIndex={0} isConnectable={true} dragging={false} />);

        expect(container.firstChild).toBeInTheDocument();
    });

    it('displays label', () => {
        const data = { 
            label: 'Test Correlation', 
            correlationType: 'pearson' as const,
            lastResult: { correlation: null, sampleSize: 0, computedAt: new Date().toISOString() },
            isComputing: false 
        };
        const { container } = render(<CorrelationNode id="node-1" data={data} selected={false} type="correlation" zIndex={0} isConnectable={true} dragging={false} />);

        expect(container.textContent).toContain('Test Correlation');
    });

    it('displays correlation result when provided', () => {
        const data = { 
            label: 'Corr', 
            correlationType: 'pearson' as const,
            lastResult: { 
                correlation: 0.95, 
                sampleSize: 100, 
                computedAt: new Date().toISOString() 
            },
            isComputing: false 
        };
        const { container } = render(<CorrelationNode id="node-1" data={data} selected={false} type="correlation" zIndex={0} isConnectable={true} dragging={false} />);

        expect(container.textContent).toContain('0.950');
        expect(container.textContent).toContain('Strong +');
    });

    it('renders input and output handles', () => {
        const data = { 
            label: 'Corr', 
            correlationType: 'pearson' as const,
            lastResult: { correlation: null, sampleSize: 0, computedAt: new Date().toISOString() },
            isComputing: false 
        };
        render(<CorrelationNode id="node-1" data={data} selected={false} type="correlation" zIndex={0} isConnectable={true} dragging={false} />);

        expect(screen.getByTestId('handle-target-inputA')).toBeInTheDocument();
        expect(screen.getByTestId('handle-target-inputB')).toBeInTheDocument();
        expect(screen.getByTestId('handle-source-output')).toBeInTheDocument();
    });
});
