import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LedgerSourceNode } from '../src/features/nodeEditor/nodes/LedgerSourceNode';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';

// Mock React Flow components
vi.mock('@xyflow/react', () => ({
    Handle: ({ id, type }: any) => <div data-testid={`handle-${type}-${id}`} />,
    Position: { Right: 'right', Left: 'left' },
}));

// Mock stores
vi.mock('../src/stores/useLedgerStore');
vi.mock('../src/stores/useProfileStore');

describe('LedgerSourceNode', () => {
    const mockSchemas = [
        { _id: 'ledger-1', name: 'Coffee Ledger', fields: [{ name: 'Price', type: 'number' }] },
        { _id: 'ledger-2', name: 'Sleep Ledger', fields: [{ name: 'Hours', type: 'number' }, { name: 'Note', type: 'text' }] }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useProfileStore as any).mockReturnValue({ activeProfileId: 'profile-1' });
        (useLedgerStore as any).mockReturnValue({
            schemas: mockSchemas,
            fetchSchemas: vi.fn(),
        });
    });

    it('renders placeholder when no ledger is selected', () => {
        const data = { label: 'Source' };
        render(<LedgerSourceNode id="node-1" data={data} selected={false} type="ledgerSource" zIndex={0} isConnectable={true} dragging={false} />);

        expect(screen.getByText('Select Ledger...')).toBeInTheDocument();
    });

    it('opens configuration panel when gear icon is clicked', () => {
        const data = { label: 'Source' };
        render(<LedgerSourceNode id="node-1" data={data} selected={false} type="ledgerSource" zIndex={0} isConnectable={true} dragging={false} />);

        const configBtn = screen.getByTitle('Configure');
        fireEvent.click(configBtn);

        expect(screen.getByText('Select Ledger:')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('populates ports when a ledger is selected', async () => {
        const data: any = { label: 'Source' };
        render(<LedgerSourceNode id="node-1" data={data} selected={false} type="ledgerSource" zIndex={0} isConnectable={true} dragging={false} />);

        fireEvent.click(screen.getByTitle('Configure'));
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'ledger-2' } });

        // Check if header updated
        expect(screen.getByText('Sleep Ledger')).toBeInTheDocument();

        // Check if ports are rendered
        expect(screen.getByText('Hours')).toBeInTheDocument();
        expect(screen.getByText('Note')).toBeInTheDocument();

        // Verify handle IDs follow the standard format source-{type}-{name}
        expect(screen.getByTestId('handle-source-source-number-Hours')).toBeInTheDocument();
        expect(screen.getByTestId('handle-source-source-text-Note')).toBeInTheDocument();
    });

    it('toggles expansion when header is clicked', () => {
        const data: any = { 
            label: 'Source', 
            ledgerId: 'ledger-1', 
            ledgerName: 'Coffee Ledger',
            ports: [{ id: 'source-number-Price', type: 'number', fieldName: 'Price' }]
        };
        render(<LedgerSourceNode id="node-1" data={data} selected={false} type="ledgerSource" zIndex={0} isConnectable={true} dragging={false} />);

        // Initially expanded
        expect(screen.getByText('Price')).toBeInTheDocument();

        // Click header to collapse
        fireEvent.click(screen.getByText('Coffee Ledger'));
        expect(screen.queryByText('Price')).not.toBeInTheDocument();

        // Click again to expand
        fireEvent.click(screen.getByText('Coffee Ledger'));
        expect(screen.getByText('Price')).toBeInTheDocument();
    });
});
