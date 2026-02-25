import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TriggerNode } from '../src/features/nodeEditor/nodes/TriggerNode';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';

// Mock stores
vi.mock('../src/stores/useLedgerStore');
vi.mock('../src/stores/useProfileStore');

// Mock React Flow components
vi.mock('@xyflow/react', () => ({
    Handle: ({ id, type }: any) => <div data-testid={`handle-${type}-${id}`} />,
    Position: { Right: 'right', Left: 'left' },
}));

describe('TriggerNode', () => {
    const mockSchemas = [
        { _id: 'ledger-1', name: 'Tests' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useProfileStore as any).mockReturnValue({ activeProfileId: 'p1' });
        (useLedgerStore as any).mockReturnValue({
            schemas: mockSchemas,
            fetchSchemas: vi.fn(),
        });
    });

    it('renders with default armed status', () => {
        const data = { label: 'Trigger', status: 'armed' };
        render(<TriggerNode id="n1" data={data} selected={false} type="trigger" zIndex={0} isConnectable={true} dragging={false} />);

        expect(screen.getByText('Trigger')).toBeInTheDocument();
        expect(screen.getByText('Armed')).toBeInTheDocument();
    });

    it('allows configuring ledger and event type', () => {
        const data: any = { label: 'Trigger', status: 'armed', eventType: 'on-create' };
        render(<TriggerNode id="n1" data={data} selected={false} type="trigger" zIndex={0} isConnectable={true} dragging={false} />);

        // Select ledger
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'ledger-1' } });
        expect(data.ledgerId).toBe('ledger-1');

        // Toggle event type
        const editBtn = screen.getByText('On Edit');
        fireEvent.click(editBtn);
        expect(data.eventType).toBe('on-edit');
    });

    it('displays fired status with time', () => {
        const now = new Date();
        const data = { 
            label: 'Trigger', 
            status: 'fired', 
            lastFired: now.toISOString() 
        };
        render(<TriggerNode id="n1" data={data} selected={false} type="trigger" zIndex={0} isConnectable={true} dragging={false} />);

        expect(screen.getByText(/Fired:/)).toBeInTheDocument();
    });

    it('displays error status and message', () => {
        const data = { 
            label: 'Trigger', 
            status: 'error', 
            error: 'Loop detected' 
        };
        render(<TriggerNode id="n1" data={data} selected={false} type="trigger" zIndex={0} isConnectable={true} dragging={false} />);

        expect(screen.getByText('Error: Loop detected')).toBeInTheDocument();
    });
});
