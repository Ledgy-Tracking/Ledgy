import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LedgerTable } from '../src/features/ledger/LedgerTable';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';
import { useUIStore } from '../src/stores/useUIStore';

vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: vi.fn().mockImplementation(({ count, estimateSize }) => ({
        getVirtualItems: () =>
            Array.from({ length: count }, (_, i) => ({
                index: i, key: i, start: i * estimateSize(), size: estimateSize(),
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
    _id: 'schema:sort-123',
    type: 'schema' as const,
    name: 'Sort Test Ledger',
    fields: [
        { name: 'Name', type: 'text' as const },
        { name: 'Score', type: 'number' as const },
    ],
    profileId: 'profile-1',
    projectId: 'project-1',
    schema_version: 1,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
};

// Entries in insertion order: Bravo(20), Alpha(10), Charlie(30)
// Ascending by Name:  Alpha, Bravo, Charlie
// Descending by Name: Charlie, Bravo, Alpha
const mockEntries = [
    {
        _id: 'entry:sort-1',
        type: 'entry' as const,
        schemaId: 'schema:sort-123',
        ledgerId: 'schema:sort-123',
        data: { Name: 'Bravo', Score: 20 },
        profileId: 'profile-1',
        schema_version: 1,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
    },
    {
        _id: 'entry:sort-2',
        type: 'entry' as const,
        schemaId: 'schema:sort-123',
        ledgerId: 'schema:sort-123',
        data: { Name: 'Alpha', Score: 10 },
        profileId: 'profile-1',
        schema_version: 1,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
    },
    {
        _id: 'entry:sort-3',
        type: 'entry' as const,
        schemaId: 'schema:sort-123',
        ledgerId: 'schema:sort-123',
        data: { Name: 'Charlie', Score: 30 },
        profileId: 'profile-1',
        schema_version: 1,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
    },
];

function setupStore() {
    (useLedgerStore as any).mockReturnValue({
        schemas: [mockSchema],
        entries: { 'schema:sort-123': mockEntries },
        allEntries: { 'schema:sort-123': mockEntries },
        fetchEntries: vi.fn(),
        deleteEntry: vi.fn(),
        backLinks: {},
        fetchBackLinks: vi.fn(),
    });
    (useProfileStore as any).mockReturnValue({
        activeProfileId: 'profile-1',
    });
}

function getDataRows() {
    const grid = screen.getByRole('grid');
    return Array.from(grid.querySelectorAll('[role="row"]')).filter(
        row => row.querySelector('[role="gridcell"]')
    );
}

describe('dataLabHeaderSorting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupStore();
    });

    it('clicking a column header once renders entries in ascending order', () => {
        render(<LedgerTable schemaId="schema:sort-123" />);

        const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
        fireEvent.click(nameHeader);

        const rows = getDataRows();
        expect(rows[0]).toHaveTextContent('Alpha');
        expect(rows[1]).toHaveTextContent('Bravo');
        expect(rows[2]).toHaveTextContent('Charlie');
    }, 10000);

    it('clicking the same column header twice renders entries in descending order', () => {
        render(<LedgerTable schemaId="schema:sort-123" />);

        const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
        fireEvent.click(nameHeader);
        fireEvent.click(nameHeader);

        const rows = getDataRows();
        expect(rows[0]).toHaveTextContent('Charlie');
        expect(rows[1]).toHaveTextContent('Bravo');
        expect(rows[2]).toHaveTextContent('Alpha');
    });

    it('clicking the same column header three times restores original insertion order', () => {
        render(<LedgerTable schemaId="schema:sort-123" />);

        const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
        fireEvent.click(nameHeader); // asc
        fireEvent.click(nameHeader); // desc
        fireEvent.click(nameHeader); // removed

        const rows = getDataRows();
        // Original insertion order: Bravo, Alpha, Charlie
        expect(rows[0]).toHaveTextContent('Bravo');
        expect(rows[1]).toHaveTextContent('Alpha');
        expect(rows[2]).toHaveTextContent('Charlie');
    });

    it('Shift+clicking a second column adds multi-column sort with aria-sort on both headers', () => {
        render(<LedgerTable schemaId="schema:sort-123" />);

        const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
        const scoreHeader = screen.getByRole('columnheader', { name: /^score/i });

        fireEvent.click(nameHeader); // primary sort asc
        fireEvent.click(scoreHeader, { shiftKey: true }); // secondary sort asc

        expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
        expect(scoreHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('sort indicator glyph ▲ appears in column header after first click', () => {
        render(<LedgerTable schemaId="schema:sort-123" />);

        const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
        fireEvent.click(nameHeader);

        expect(nameHeader).toHaveTextContent('▲');
    });

    it('sort indicator changes to ▼ after second click on same column header', () => {
        render(<LedgerTable schemaId="schema:sort-123" />);

        const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
        fireEvent.click(nameHeader);
        fireEvent.click(nameHeader);

        expect(nameHeader).toHaveTextContent('▼');
    });
});

describe('dataLabColumnResize', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupStore();
    });

    it('mousedown on resize handle followed by mousemove updates column width', async () => {
        const { act } = await import('@testing-library/react');
        render(<LedgerTable schemaId="schema:sort-123" />);

        const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
        const resizeHandle = nameHeader.querySelector('[style*="col-resize"]') as HTMLElement;
        expect(resizeHandle).not.toBeNull();

        // Start resize from default 150px (clientX=200), drag 50px right (clientX=250) → 200px wide
        fireEvent.mouseDown(resizeHandle, { clientX: 200 });
        await act(async () => {
            fireEvent.mouseMove(window, { clientX: 250 });
        });

        expect(nameHeader).toHaveStyle({ width: '200px' });
    });

    it('column resize enforces minimum width of 60px', async () => {
        const { act } = await import('@testing-library/react');
        render(<LedgerTable schemaId="schema:sort-123" />);

        const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
        const resizeHandle = nameHeader.querySelector('[style*="col-resize"]') as HTMLElement;

        // Default 150px, drag left past minimum (delta = -200 → 0px → clamped to 60px)
        fireEvent.mouseDown(resizeHandle, { clientX: 200 });
        await act(async () => {
            fireEvent.mouseMove(window, { clientX: 0 });
        });

        expect(nameHeader).toHaveStyle({ width: '60px' });
    });

    it('mouseup stops resize — subsequent mousemove does not change width', async () => {
        const { act } = await import('@testing-library/react');
        render(<LedgerTable schemaId="schema:sort-123" />);

        const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
        const resizeHandle = nameHeader.querySelector('[style*="col-resize"]') as HTMLElement;

        fireEvent.mouseDown(resizeHandle, { clientX: 200 });
        await act(async () => {
            fireEvent.mouseMove(window, { clientX: 250 }); // width → 200px
        });
        await act(async () => {
            fireEvent.mouseUp(window); // release
        });
        await act(async () => {
            fireEvent.mouseMove(window, { clientX: 400 }); // should have no effect
        });

        // Width should remain at 200px (not 350px)
        expect(nameHeader).toHaveStyle({ width: '200px' });
    });

    it('resize handle click does not trigger sort', () => {
        render(<LedgerTable schemaId="schema:sort-123" />);

        const nameHeader = screen.getByRole('columnheader', { name: /^name/i });
        const resizeHandle = nameHeader.querySelector('[style*="col-resize"]') as HTMLElement;

        fireEvent.click(resizeHandle);

        // No sort indicator — aria-sort remains none
        expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    });
});
