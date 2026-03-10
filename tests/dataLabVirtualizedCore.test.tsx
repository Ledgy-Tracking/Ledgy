import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LedgerTable } from '../src/features/ledger/LedgerTable';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useUIStore } from '../src/stores/useUIStore';

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

const mockSchema = {
    _id: 'schema:virt-123',
    type: 'schema' as const,
    name: 'Virt Test Ledger',
    fields: [
        { name: 'Title', type: 'text' as const },
        { name: 'Value', type: 'number' as const },
    ],
    profileId: 'profile-1',
    projectId: 'project-1',
    schema_version: 1,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
};

const makeEntry = (n: number) => ({
    _id: `entry:virt-${n}`,
    type: 'entry' as const,
    schemaId: 'schema:virt-123',
    ledgerId: 'schema:virt-123',
    data: { Title: `Entry ${n}`, Value: n * 10 },
    profileId: 'profile-1',
    schema_version: 1,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
});

const mockEntries3 = [makeEntry(1), makeEntry(2), makeEntry(3)];

function setupStore(entries = mockEntries3) {
    (useLedgerStore as any).mockReturnValue({
        schemas: [mockSchema],
        entries: { 'schema:virt-123': entries },
        allEntries: { 'schema:virt-123': entries },
        fetchEntries: vi.fn(),
        deleteEntry: vi.fn(),
        backLinks: {},
        fetchBackLinks: vi.fn(),
    });
    (useProfileStore as any).mockReturnValue({
        activeProfileId: 'profile-1',
    });
}

describe('dataLabVirtualizedCore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupStore();
    });

    it('calls useVirtualizer with count equal to ledgerEntries.length', () => {
        render(<LedgerTable schemaId="schema:virt-123" />);

        expect(useVirtualizer).toHaveBeenCalledWith(
            expect.objectContaining({ count: mockEntries3.length })
        );
    });

    it('renders exactly the same number of row elements as entries (not 10,000)', () => {
        render(<LedgerTable schemaId="schema:virt-123" />);

        // role="grid" now wraps both the sticky header row and the virtual data rows.
        // Filter for data rows only (those containing role="gridcell" children).
        const grid = screen.getByRole('grid');
        const dataRows = Array.from(grid.querySelectorAll('[role="row"]')).filter(
            row => row.querySelector('[role="gridcell"]')
        );
        expect(dataRows.length).toBe(3);
    });

    it('renders InlineEntryRow outside the virtualizer when Add Entry button is clicked', () => {
        render(<LedgerTable schemaId="schema:virt-123" />);

        const addButton = screen.getByText(/add entry/i);
        fireEvent.click(addButton);

        // Save and Cancel buttons appear — InlineEntryRow is rendered
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();

        // role="grid" now wraps both the header rowgroup and the scroll container.
        // The scroll container (no role, second child of grid) contains the InlineEntryRow
        // wrapper and the virtualizer spacer as direct children.
        const grid = screen.getByRole('grid');
        const scrollContainer = grid.children[1] as HTMLElement;
        const scrollChildren = Array.from(scrollContainer.children);

        const virtualizerSpacer = scrollChildren.find(
            (el) => (el as HTMLElement).style.position === 'relative'
        ) as HTMLElement | undefined;
        const inlineWrapper = scrollChildren[0] as HTMLElement;
        // Inline wrapper should come before the virtualizer spacer in DOM order
        expect(scrollChildren.indexOf(inlineWrapper)).toBeLessThan(
            scrollChildren.indexOf(virtualizerSpacer as Element)
        );
    });

    it('clicking a rendered row calls setSelectedEntryId with that entry _id', () => {
        const mockSetSelectedEntryId = vi.fn();
        const mockSetRightInspector = vi.fn();
        (useUIStore as any).mockReturnValue({
            setSelectedEntryId: mockSetSelectedEntryId,
            setRightInspector: mockSetRightInspector,
        });

        render(<LedgerTable schemaId="schema:virt-123" />);

        const firstRowText = screen.getByText('Entry 1');
        fireEvent.click(firstRowText);

        expect(mockSetSelectedEntryId).toHaveBeenCalledWith('entry:virt-1');
    });

    it('pressing N key opens the inline entry row (Save button appears)', () => {
        render(<LedgerTable schemaId="schema:virt-123" />);

        fireEvent.keyDown(window, { key: 'N', code: 'KeyN' });

        expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('pressing ArrowDown selects the first row and scrollToIndex is called', () => {
        render(<LedgerTable schemaId="schema:virt-123" />);

        fireEvent.keyDown(window, { key: 'ArrowDown' });

        // First data row should now be selected
        const selectedRows = document.querySelectorAll('[data-state="selected"]');
        expect(selectedRows.length).toBe(1);
        expect(selectedRows[0]).toHaveTextContent('Entry 1');

        // scrollToIndex should have been called on the virtualizer instance
        const virtualizerInstance = (useVirtualizer as any).mock.results[0].value;
        expect(virtualizerInstance.scrollToIndex).toHaveBeenCalledWith(0, { align: 'auto' });
    });

    it('ArrowDown then ArrowUp navigates between rows', () => {
        render(<LedgerTable schemaId="schema:virt-123" />);

        fireEvent.keyDown(window, { key: 'ArrowDown' }); // selects index 0
        fireEvent.keyDown(window, { key: 'ArrowDown' }); // selects index 1

        let selected = document.querySelectorAll('[data-state="selected"]');
        expect(selected[0]).toHaveTextContent('Entry 2');

        fireEvent.keyDown(window, { key: 'ArrowUp' }); // back to index 0

        selected = document.querySelectorAll('[data-state="selected"]');
        expect(selected[0]).toHaveTextContent('Entry 1');
    });

    it('Delete key on a selected row shows inline confirmation bar', () => {
        render(<LedgerTable schemaId="schema:virt-123" />);

        // Select first row via click
        fireEvent.click(screen.getByText('Entry 1'));
        fireEvent.keyDown(window, { key: 'Delete' });

        expect(screen.getByText(/delete this entry\?/i)).toBeInTheDocument();
    });

    it('Enter key after Delete confirms deletion and calls deleteEntry', () => {
        const mockDeleteEntry = vi.fn();
        (useLedgerStore as any).mockReturnValue({
            schemas: [mockSchema],
            entries: { 'schema:virt-123': mockEntries3 },
            allEntries: { 'schema:virt-123': mockEntries3 },
            fetchEntries: vi.fn(),
            deleteEntry: mockDeleteEntry,
            backLinks: {},
            fetchBackLinks: vi.fn(),
        });

        render(<LedgerTable schemaId="schema:virt-123" />);

        fireEvent.click(screen.getByText('Entry 1'));
        fireEvent.keyDown(window, { key: 'Delete' });
        fireEvent.keyDown(window, { key: 'Enter' });

        expect(mockDeleteEntry).toHaveBeenCalledWith('entry:virt-1');
    });

    it('Escape key after Delete cancels confirmation bar', () => {
        render(<LedgerTable schemaId="schema:virt-123" />);

        fireEvent.click(screen.getByText('Entry 1'));
        fireEvent.keyDown(window, { key: 'Delete' });
        expect(screen.getByText(/delete this entry\?/i)).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByText(/delete this entry\?/i)).not.toBeInTheDocument();
    });

    it('shows "all entries deleted" message when allEntries has data but entries is empty', () => {
        (useLedgerStore as any).mockReturnValue({
            schemas: [mockSchema],
            entries: { 'schema:virt-123': [] },
            allEntries: { 'schema:virt-123': mockEntries3 },
            fetchEntries: vi.fn(),
            deleteEntry: vi.fn(),
            backLinks: {},
            fetchBackLinks: vi.fn(),
        });

        render(<LedgerTable schemaId="schema:virt-123" />);

        expect(screen.getByText(/all entries have been deleted/i)).toBeInTheDocument();
    });
});
