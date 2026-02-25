import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BackLinksPanel } from '../src/features/ledger/BackLinksPanel';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';
import { BrowserRouter } from 'react-router-dom';

// Mock stores
vi.mock('../src/stores/useLedgerStore', () => ({
    useLedgerStore: vi.fn(),
}));

vi.mock('../src/stores/useProfileStore', () => ({
    useProfileStore: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ profileId: 'profile-1' }),
    };
});

const mockBackLinkEntry = {
    _id: 'entry:ref',
    ledgerId: 'ledger:source',
    type: 'entry' as const,
    data: { 
        Name: 'Source Entry',
        RefField: 'entry:target'
    },
    schemaId: 'ledger:source',
    profileId: 'profile-1',
    schemaVersion: 1,
    createdAt: '',
    updatedAt: ''
};

const mockSchema = {
    _id: 'ledger:source',
    ledgerId: 'ledger:source',
    name: 'Source Ledger',
    fields: [{ name: 'Name', type: 'text' }, { name: 'RefField', type: 'relation' }]
};

describe('BackLinksPanel', () => {
    const mockFetchBackLinks = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useProfileStore as any).mockReturnValue({
            activeProfileId: 'profile-1',
        });
        (useLedgerStore as any).mockReturnValue({
            backLinks: { 'entry:target': [mockBackLinkEntry] },
            fetchBackLinks: mockFetchBackLinks,
            schemas: [mockSchema]
        });
    });

    it('fetches back-links on mount', () => {
        render(
            <BrowserRouter>
                <BackLinksPanel targetEntryId="entry:target" targetLedgerId="ledger:target" />
            </BrowserRouter>
        );

        expect(mockFetchBackLinks).toHaveBeenCalledWith('profile-1', 'entry:target');
    });

    it('renders back-link entries', () => {
        render(
            <BrowserRouter>
                <BackLinksPanel targetEntryId="entry:target" targetLedgerId="ledger:target" />
            </BrowserRouter>
        );

        expect(screen.getByText('Referenced By (1)')).toBeInTheDocument();
        expect(screen.getByText('Source Entry')).toBeInTheDocument();
        expect(screen.getByText('from')).toBeInTheDocument();
        expect(screen.getByText('Source Ledger')).toBeInTheDocument();
        expect(screen.getByText('RefField')).toBeInTheDocument();
    });

    it('renders nothing if no back-links', () => {
        (useLedgerStore as any).mockReturnValue({
            backLinks: { 'entry:target': [] },
            fetchBackLinks: mockFetchBackLinks,
            schemas: []
        });

        render(
            <BrowserRouter>
                <BackLinksPanel targetEntryId="entry:target" targetLedgerId="ledger:target" />
            </BrowserRouter>
        );

        expect(screen.queryByText(/Referenced By/)).not.toBeInTheDocument();
    });

    it('includes correct highlight state in Link', () => {
        render(
            <BrowserRouter>
                <BackLinksPanel targetEntryId="entry:target" targetLedgerId="ledger:target" />
            </BrowserRouter>
        );

        const link = screen.getByRole('link');
        expect(link.getAttribute('href')).toContain('/app/profile-1/ledger/ledger:source');
    });
});
