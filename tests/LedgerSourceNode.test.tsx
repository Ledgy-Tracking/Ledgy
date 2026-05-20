import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LedgerSourceNode } from '../src/features/nodeEditor/nodes/LedgerSourceNode';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';

// Mock React Flow components
vi.mock('@xyflow/react', () => ({
    Handle: ({ id, type }: any) => <div data-testid={`handle-${type}-${id}`} />,
    Position: { Right: 'right', Left: 'left' },
    useReactFlow: () => ({ updateNodeData: vi.fn() }),
}));

// Mock stores
vi.mock('../src/stores/useLedgerStore');
vi.mock('../src/stores/useProfileStore', () => {
    const getState = vi.fn(() => ({ activeProfileId: 'profile-1' }));
    const useProfileStore = vi.fn(() => ({ activeProfileId: 'profile-1' }));
    useProfileStore.getState = getState;
    return { useProfileStore };
});
// Also mock db so useLiveQuery's subscription setup doesn't throw
vi.mock('../src/lib/db', () => ({
    getProfileDb: vi.fn(() => ({
        changes: vi.fn(() => ({ on: vi.fn().mockReturnThis(), cancel: vi.fn() })),
        getAllDocuments: vi.fn().mockResolvedValue([]),
    })),
}));

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
});
