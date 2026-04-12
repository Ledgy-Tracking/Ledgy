import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArithmeticNode } from '../src/features/nodeEditor/nodes/ArithmeticNode';

// Mock React Flow components and hooks
vi.mock('@xyflow/react', () => ({
    Handle: ({ id, type }: any) => <div data-testid={`handle-${type}-${id}`} />,
    Position: { Right: 'right', Left: 'left' },
    useReactFlow: () => ({ updateNodeData: vi.fn() }),
}));

describe('ArithmeticNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        const data = { 
            label: 'Arith', 
            operation: 'add' as const,
            precision: 2,
            inputCount: 2,
            lastResult: { value: null, computedAt: new Date().toISOString() },
            isComputing: false 
        };
        const { container } = render(<ArithmeticNode id="node-1" data={data} selected={false} type="arithmetic" zIndex={0} isConnectable={true} dragging={false} />);

        expect(container.firstChild).toBeInTheDocument();
    });

    it('displays label', () => {
        const data = { 
            label: 'Test Arithmetic', 
            operation: 'add' as const,
            precision: 2,
            inputCount: 2,
            lastResult: { value: null, computedAt: new Date().toISOString() },
            isComputing: false 
        };
        const { container } = render(<ArithmeticNode id="node-1" data={data} selected={false} type="arithmetic" zIndex={0} isConnectable={true} dragging={false} />);

        expect(container.textContent).toContain('Test Arithmetic');
    });

    it('displays operation symbol', () => {
        const data = { 
            label: 'Arith', 
            operation: 'multiply' as const,
            precision: 2,
            inputCount: 2,
            lastResult: { value: null, computedAt: new Date().toISOString() },
            isComputing: false 
        };
        const { container } = render(<ArithmeticNode id="node-1" data={data} selected={false} type="arithmetic" zIndex={0} isConnectable={true} dragging={false} />);

        expect(container.textContent).toContain('×');
        expect(container.textContent).toContain('multiply');
    });

    it('displays arithmetic result when provided', () => {
        const data = { 
            label: 'Arith', 
            operation: 'add' as const,
            precision: 2,
            inputCount: 2,
            inputs: [10, 20],
            lastResult: { value: 30, computedAt: new Date().toISOString() },
            isComputing: false 
        };
        const { container } = render(<ArithmeticNode id="node-1" data={data} selected={false} type="arithmetic" zIndex={0} isConnectable={true} dragging={false} />);

        expect(container.textContent).toContain('30');
    });

    it('renders dynamic input handles', () => {
        const data = { 
            label: 'Arith', 
            operation: 'add' as const,
            precision: 2,
            inputCount: 3,
            lastResult: { value: null, computedAt: new Date().toISOString() },
            isComputing: false 
        };
        render(<ArithmeticNode id="node-1" data={data} selected={false} type="arithmetic" zIndex={0} isConnectable={true} dragging={false} />);

        expect(screen.getByTestId('handle-target-input-0')).toBeInTheDocument();
        expect(screen.getByTestId('handle-target-input-1')).toBeInTheDocument();
        expect(screen.getByTestId('handle-target-input-2')).toBeInTheDocument();
        expect(screen.getByTestId('handle-source-output')).toBeInTheDocument();
    });
});
