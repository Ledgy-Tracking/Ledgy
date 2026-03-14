import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LedgerTable } from '../src/features/ledger/LedgerTable';
import { BulkActionBar } from '../src/features/ledger/BulkActionBar';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';
import { useUIStore } from '../src/stores/useUIStore';
import { getProfileDb } from '../src/lib/db';

vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: vi.fn().mockImplementation(({ count, estimateSize }) => ({
        getVirtualItems: () =>
            Array.from({ length: count }, (_, i) => ({
                index: i,
                key: i,
                start: i * estimateSize(),
                size: estimateSize(),
            })),
        getTotalSize: () => count * estimateSize(),
        measureElement: vi.fn(),
        scrollToIndex: vi.fn(),
    })),
}));

vi.mock('../src/stores/useLedgerStore', () => ({
    useLedgerStore: vi.fn(),
}));

vi.mock('../src/stores/useProfileStore', () => ({
    useProfileStore: vi.fn(),
}));

vi.mock('../src/stores/useUIStore', () => ({
    useUIStore: vi.fn().mockReturnValue({
        setSelectedEntryId: vi.fn(),
        setRightInspector: vi.fn(),
    }),
}));

vi.mock('../src/lib/db', () => ({
    getProfileDb: vi.fn(),
}));

const mockSchema = {
    _id: 'schema:bulk',
    type: 'schema' as const,
    name: 'Bulk Ledger',
    fields: [
        { name: 'Name', type: 'text' as const },
        { name: 'tags', type: 'multi_select' as const },
    ],
    profileId: 'profile-1',
    projectId: 'project-1',
    schema_version: 1,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
};

const makeEntry = (n: number) => ({
    _id: `entry:${n}`,
    type: 'entry' as const,
    schemaId: 'schema:bulk',
    ledgerId: 'schema:bulk',
    data: { Name: `Entry ${n}`, tags: n === 1 ? ['alpha'] : [] },
    profileId: 'profile-1',
    schema_version: 1,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
});

const entries = [makeEntry(1), makeEntry(2), makeEntry(3)];

function setupLedgerStore(overrides?: Record<string, unknown>) {
    const defaultStore = {
        schemas: [mockSchema],
        entries: { 'schema:bulk': entries },
        allEntries: { 'schema:bulk': entries },
        selectedRowIds: new Set<string>(),
        fetchEntries: vi.fn(),
        deleteEntry: vi.fn(),
        toggleRowSelection: vi.fn(),
        selectAll: vi.fn(),
        clearSelection: vi.fn(),
        backLinks: {},
        fetchBackLinks: vi.fn(),
    };

    (useLedgerStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStore,
        ...overrides,
    });
    (useProfileStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        activeProfileId: 'profile-1',
    });
}

describe('dataLabBulkSelection — LedgerTable', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupLedgerStore();
    });

    it('Test 1 — Checkbox column header renders "Select All"', () => {
        render(<LedgerTable schemaId="schema:bulk" />);
        expect(screen.getByRole('checkbox', { name: /select all/i })).toBeInTheDocument();
    });

    it('Test 2 — Row checkbox toggles selection via store action', () => {
        const toggleRowSelection = vi.fn();
        setupLedgerStore({ toggleRowSelection });
        render(<LedgerTable schemaId="schema:bulk" />);

        fireEvent.click(screen.getByRole('checkbox', { name: /select row 1/i }));
        expect(toggleRowSelection).toHaveBeenCalledWith('entry:1');
    });

    it('Test 3 — Select All toggles all visible rows', () => {
        const selectAll = vi.fn();
        setupLedgerStore({ selectAll });
        render(<LedgerTable schemaId="schema:bulk" />);

        fireEvent.click(screen.getByRole('checkbox', { name: /select all/i }));
        expect(selectAll).toHaveBeenCalledWith(expect.arrayContaining(['entry:1', 'entry:2', 'entry:3']));
    });

    it('Test 4 — Partial selection marks header checkbox as mixed', () => {
        setupLedgerStore({ selectedRowIds: new Set<string>(['entry:1']) });
        render(<LedgerTable schemaId="schema:bulk" />);

        expect(screen.getByRole('checkbox', { name: /select all/i })).toHaveAttribute('aria-checked', 'mixed');
    });

    it('Test 5 — Space key toggles focused row selection', () => {
        const toggleRowSelection = vi.fn();
        setupLedgerStore({ toggleRowSelection });
        render(<LedgerTable schemaId="schema:bulk" />);

        const row = screen.getByText('Entry 1').closest('[role="row"]') as HTMLElement;
        row.focus();
        fireEvent.keyDown(row, { key: ' ' });
        expect(toggleRowSelection).toHaveBeenCalledWith('entry:1');
    });

    it('Test 6 — Shift+Click selects a row range', () => {
        const selectAll = vi.fn();
        setupLedgerStore({ selectAll });
        render(<LedgerTable schemaId="schema:bulk" />);

        fireEvent.click(screen.getByText('Entry 1'));
        fireEvent.click(screen.getByText('Entry 3'), { shiftKey: true });

        expect(selectAll).toHaveBeenLastCalledWith(expect.arrayContaining(['entry:1', 'entry:2', 'entry:3']));
    });

    it('Test 7 — Selection state survives render and remains checked', () => {
        setupLedgerStore({ selectedRowIds: new Set<string>(['entry:2']) });
        render(<LedgerTable schemaId="schema:bulk" />);

        expect(screen.getByRole('checkbox', { name: /select row 2/i })).toBeChecked();
    });
});

describe('dataLabBulkSelection — BulkActionBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupLedgerStore({
            selectedRowIds: new Set<string>(['entry:1', 'entry:2', 'entry:3']),
        });
    });

    it('Test 8 — Bulk action bar displays selected count', () => {
        render(<BulkActionBar schemaId="schema:bulk" />);
        expect(screen.getByText('3 entries selected')).toBeInTheDocument();
    });

    it('Test 9 — Bulk Delete modal shows selected count', () => {
        render(<BulkActionBar schemaId="schema:bulk" />);
        fireEvent.click(screen.getByRole('button', { name: /delete selected/i }));
        expect(screen.getAllByText(/delete 3 entries\?/i).length).toBeGreaterThan(0);
    });

    it('Test 10 — Confirm bulk delete clears selection', async () => {
        const clearSelection = vi.fn();
        const fetchEntries = vi.fn().mockResolvedValue(undefined);
        setupLedgerStore({
            selectedRowIds: new Set<string>(['entry:1', 'entry:2', 'entry:3']),
            clearSelection,
            fetchEntries,
        });

        const mockDb = {
            get: vi.fn().mockImplementation(async (id: string) => ({ _id: id, _rev: '1-a', data: {} })),
            bulkDocs: vi.fn().mockResolvedValue([
                { ok: true, id: 'entry:1' },
                { ok: true, id: 'entry:2' },
                { ok: true, id: 'entry:3' },
            ]),
        };
        (getProfileDb as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ db: mockDb });

        render(<BulkActionBar schemaId="schema:bulk" />);
        fireEvent.click(screen.getByRole('button', { name: /delete selected/i }));
        fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

        await waitFor(() => {
            expect(clearSelection).toHaveBeenCalled();
            expect(fetchEntries).toHaveBeenCalledWith('profile-1', 'schema:bulk');
        });
    });

    it('Test 11 — Assign Tag modal opens with tag input', () => {
        render(<BulkActionBar schemaId="schema:bulk" />);
        fireEvent.click(screen.getByRole('button', { name: /assign tag/i }));
        expect(screen.getByRole('combobox', { name: /tag value/i })).toBeInTheDocument();
    });
});
