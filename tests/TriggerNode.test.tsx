import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TriggerNode } from '../src/features/nodeEditor/nodes/TriggerNode';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';
import { useNodeStore } from '../src/stores/useNodeStore';

// Mock stores
vi.mock('../src/stores/useLedgerStore');
vi.mock('../src/stores/useProfileStore');
vi.mock('../src/stores/useNodeStore');

// Mock React Flow components
vi.mock('@xyflow/react', () => ({
    Handle: ({ id, type }: any) => <div data-testid={`handle-${type}-${id}`} />,
    Position: { Right: 'right', Left: 'left' },
}));

// Mock Radix Select as a native select
vi.mock('@/components/ui/select', () => ({
    Select: ({ children, value, onValueChange }: any) => (
        <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectValue: ({ placeholder }: any) => <></>,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

describe('TriggerNode', () => {
    const mockSchemas = [
        { _id: 'ledger-1', name: 'Tests' }
    ];

    const mockUpdateNodeData = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useProfileStore as any).mockReturnValue({ activeProfileId: 'p1' });
        (useLedgerStore as any).mockReturnValue({
            schemas: mockSchemas,
            fetchSchemas: vi.fn(),
        });
        (useNodeStore as any).mockReturnValue({ updateNodeData: mockUpdateNodeData });
        (useNodeStore as any).getState = vi.fn().mockReturnValue({ updateNodeData: mockUpdateNodeData });
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

        // Open config panel first
        fireEvent.click(screen.getByTitle('Configure'));

        // Select ledger — TriggerNode calls updateNodeData(id, { ledgerId, ledgerName, ... })
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'ledger-1' } });
        expect(mockUpdateNodeData).toHaveBeenCalledWith('n1', expect.objectContaining({ ledgerId: 'ledger-1' }));

        // Toggle event type — TriggerNode calls updateNodeData(id, { eventType })
        const editBtn = screen.getByText('On Edit');
        fireEvent.click(editBtn);
        expect(mockUpdateNodeData).toHaveBeenCalledWith('n1', expect.objectContaining({ eventType: 'on-edit' }));
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
