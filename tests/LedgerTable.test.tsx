import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LedgerTable } from '../src/features/ledger/LedgerTable';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';

// Mock stores
vi.mock('../src/stores/useLedgerStore', () => ({
    useLedgerStore: vi.fn(),
}));

vi.mock('../src/stores/useProfileStore', () => ({
    useProfileStore: vi.fn(),
}));

const mockSchema = {
    _id: 'schema:test-123',
    type: 'schema' as const,
    name: 'Test Ledger',
    fields: [
        { name: 'Name', type: 'text' as const },
        { name: 'Amount', type: 'number' as const },
        { name: 'Date', type: 'date' as const },
    ],
    profileId: 'profile-1',
    projectId: 'project-1',
    schemaVersion: 1,
    createdAt: '2026-02-23T00:00:00Z',
    updatedAt: '2026-02-23T00:00:00Z',
};

const mockEntries = [
    {
        _id: 'entry:1',
        type: 'entry' as const,
        schemaId: 'schema:test-123',
        ledgerId: 'schema:test-123',
        data: { Name: 'Test Entry 1', Amount: 100, Date: '2026-02-23' },
        profileId: 'profile-1',
        schemaVersion: 1,
        createdAt: '2026-02-23T00:00:00Z',
        updatedAt: '2026-02-23T00:00:00Z',
    },
];

describe('LedgerTable', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useLedgerStore as any).mockReturnValue({
            schemas: [mockSchema],
            entries: { 'schema:test-123': mockEntries },
            fetchEntries: vi.fn(),
        });
        (useProfileStore as any).mockReturnValue({
            activeProfileId: 'profile-1',
        });
    });

    it('renders empty state when no entries', () => {
        (useLedgerStore as any).mockReturnValue({
            schemas: [mockSchema],
            entries: {},
            fetchEntries: vi.fn(),
        });

        render(<LedgerTable schemaId="schema:test-123" />);

        expect(screen.getByText(/no entries yet/i)).toBeInTheDocument();
        expect(screen.getByText('N')).toBeInTheDocument();
    });

    it('renders entries in table', () => {
        render(<LedgerTable schemaId="schema:test-123" />);

        expect(screen.getByText('Test Ledger')).toBeInTheDocument();
        expect(screen.getByText('Test Entry 1')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('renders column headers with field types', () => {
        render(<LedgerTable schemaId="schema:test-123" />);

        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Amount')).toBeInTheDocument();
        expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('opens inline entry row when Add Entry button clicked', () => {
        render(<LedgerTable schemaId="schema:test-123" />);

        const addButton = screen.getByText(/add entry/i);
        fireEvent.click(addButton);

        // InlineEntryRow should appear with Save/Cancel buttons
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('responds to N key for new entry', () => {
        render(<LedgerTable schemaId="schema:test-123" />);

        fireEvent.keyDown(window, { key: 'n', code: 'KeyN' });

        expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('does not trigger N key when in input field', () => {
        render(<LedgerTable schemaId="schema:test-123" />);

        // First open the inline row
        fireEvent.click(screen.getByText(/add entry/i));

        // Find an input and type 'n'
        const input = screen.getByPlaceholderText(/enter name/i);
        fireEvent.keyDown(input, { key: 'n', code: 'KeyN' });

        // Should still only have one inline row (not triggered again)
        expect(screen.getAllByText('Save').length).toBe(1);
    });
});
