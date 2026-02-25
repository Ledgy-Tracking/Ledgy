import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CorrelationNode } from '../src/features/nodeEditor/nodes/CorrelationNode';
import { computationService } from '../src/services/computationService';

// Mock computationService
vi.mock('../src/services/computationService', () => ({
    computationService: {
        computeCorrelation: vi.fn(),
    },
}));

// Mock React Flow components
vi.mock('@xyflow/react', () => ({
    Handle: ({ id, type }: any) => <div data-testid={`handle-${type}-${id}`} />,
    Position: { Right: 'right', Left: 'left' },
}));

describe('CorrelationNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly initially', () => {
        const data = { label: 'Corr', result: null, isComputing: false };
        render(<CorrelationNode id="node-1" data={data} selected={false} type="correlation" zIndex={0} isConnectable={true} dragging={false} />);

        expect(screen.getByText('Correlation')).toBeInTheDocument();
        // Check for the specific result display '-'
        const resultDisplay = screen.getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' && 
                   element.classList.contains('text-lg') && 
                   content === '-';
        });
        expect(resultDisplay).toBeInTheDocument();
    });

    it('triggers computation when input data changes', async () => {
        const data: any = { 
            label: 'Corr', 
            result: null, 
            isComputing: false,
            inputData: { x: [1, 2, 3], y: [2, 4, 6] }
        };
        
        render(<CorrelationNode id="node-1" data={data} selected={false} type="correlation" zIndex={0} isConnectable={true} dragging={false} />);

        // Wait for debounce (300ms)
        await waitFor(() => {
            expect(computationService.computeCorrelation).toHaveBeenCalledWith(
                [1, 2, 3], 
                [2, 4, 6], 
                expect.any(Function)
            );
        }, { timeout: 2000 });
    });

    it('displays result from computation service', async () => {
        const data: any = { 
            label: 'Corr', 
            result: null, 
            isComputing: false,
            inputData: { x: [1, 2, 3], y: [2, 4, 6] }
        };

        (computationService.computeCorrelation as any).mockImplementation((x: any, y: any, callback: any) => {
            callback({ result: 0.95 });
        });
        
        render(<CorrelationNode id="node-1" data={data} selected={false} type="correlation" zIndex={0} isConnectable={true} dragging={false} />);

        await waitFor(() => {
            expect(screen.getByText('0.950')).toBeInTheDocument();
            expect(screen.getByText('Strong +')).toBeInTheDocument();
        });
    });

    it('displays status message when data is insufficient', async () => {
        const data: any = { 
            label: 'Corr', 
            result: null, 
            isComputing: false,
            inputData: { x: [], y: [] }
        };
        
        render(<CorrelationNode id="node-1" data={data} selected={false} type="correlation" zIndex={0} isConnectable={true} dragging={false} />);

        await waitFor(() => {
            expect(screen.getByText(/Waiting for input data/i)).toBeInTheDocument();
        });
    });
});
