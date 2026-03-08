import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArithmeticNode } from '../src/features/nodeEditor/nodes/ArithmeticNode';
import { computationService } from '../src/services/computationService';

// Mock computationService
vi.mock('../src/services/computationService', () => ({
    computationService: {
        computeArithmetic: vi.fn(),
    },
}));

// Mock React Flow components
vi.mock('@xyflow/react', () => ({
    Handle: ({ id, type }: any) => <div data-testid={`handle-${type}-${id}`} />,
    Position: { Right: 'right', Left: 'left' },
}));

describe('ArithmeticNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly initially', () => {
        const data = { label: 'Arith', operation: 'sum', result: null, isComputing: false };
        render(<ArithmeticNode id="node-1" data={data} selected={false} type="arithmetic" zIndex={0} isConnectable={true} dragging={false} />);

        expect(screen.getByText('Arithmetic')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Sum')).toBeInTheDocument();
    });

    it('triggers computation when operation changes', async () => {
        const data: any = { 
            label: 'Arith', 
            operation: 'sum',
            result: null, 
            isComputing: false,
            inputData: { values: [10, 20] }
        };
        
        render(<ArithmeticNode id="node-1" data={data} selected={false} type="arithmetic" zIndex={0} isConnectable={true} dragging={false} />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'average' } });

        // Wait for debounce
        await waitFor(() => {
            expect(computationService.computeArithmetic).toHaveBeenCalledWith(
                [10, 20], 
                'average',
                expect.any(Function)
            );
        }, { timeout: 2000 });
    });

    it('displays result from computation service', async () => {
        const data: any = { 
            label: 'Arith', 
            operation: 'sum',
            result: null, 
            isComputing: false,
            inputData: { values: [10, 20] }
        };

        (computationService.computeArithmetic as any).mockImplementation((values: any, op: any, callback: any) => {
            callback({ result: 30 });
        });
        
        render(<ArithmeticNode id="node-1" data={data} selected={false} type="arithmetic" zIndex={0} isConnectable={true} dragging={false} />);

        await waitFor(() => {
            expect(screen.getByText('30')).toBeInTheDocument();
        });
    });
});
