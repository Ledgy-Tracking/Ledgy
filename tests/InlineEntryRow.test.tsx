import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InlineEntryRow } from '../src/features/ledger/InlineEntryRow';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';

// Mock stores
vi.mock('../src/stores/useLedgerStore', () => ({
    useLedgerStore: Object.assign(vi.fn(), {
        getState: vi.fn(() => ({
            entries: {},
            fetchEntries: vi.fn(),
        }))
    }),
}));

vi.mock('../src/stores/useProfileStore', () => ({
    useProfileStore: vi.fn(),
}));

const mockSchema = {
    _id: 'schema:test-123',
    type: 'schema' as const,
    name: 'Test Ledger',
    fields: [
        { name: 'Name', type: 'text' as const, required: true },
        { name: 'Amount', type: 'number' as const },
    ],
    profileId: 'profile-1',
    projectId: 'project-1',
    schemaVersion: 1,
    createdAt: '2026-02-23T00:00:00Z',
    updatedAt: '2026-02-23T00:00:00Z',
};

describe('InlineEntryRow', () => {
    const mockOnCancel = vi.fn();
    const mockOnComplete = vi.fn();
    const mockCreateEntry = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useLedgerStore as any).mockReturnValue({
            createEntry: mockCreateEntry,
        });
        (useProfileStore as any).mockReturnValue({
            activeProfileId: 'profile-1',
        });
    });

    it('renders input fields for each schema field', () => {
        render(
            <table><tbody>
                <InlineEntryRow
                    schema={mockSchema}
                    onCancel={mockOnCancel}
                    onComplete={mockOnComplete}
                />
            </tbody></table>
        );

        expect(screen.getByPlaceholderText(/enter name/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter amount/i)).toBeInTheDocument();
    });

    it('calls onCancel when Cancel button clicked', () => {
        render(
            <table><tbody>
                <InlineEntryRow
                    schema={mockSchema}
                    onCancel={mockOnCancel}
                    onComplete={mockOnComplete}
                />
            </tbody></table>
        );

        fireEvent.click(screen.getByText('Cancel'));
        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls createEntry and onComplete when Save clicked with valid data', async () => {
        mockCreateEntry.mockResolvedValue({ _id: 'entry:new' });

        render(
            <table><tbody>
                <InlineEntryRow
                    schema={mockSchema}
                    onCancel={mockOnCancel}
                    onComplete={mockOnComplete}
                />
            </tbody></table>
        );

        fireEvent.change(screen.getByPlaceholderText(/enter name/i), {
            target: { value: 'New Entry' }
        });
        fireEvent.change(screen.getByPlaceholderText(/enter amount/i), {
            target: { value: '123' }
        });

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockCreateEntry).toHaveBeenCalledWith(
                'profile-1',
                'schema:test-123',
                'schema:test-123',
                expect.objectContaining({ Name: 'New Entry', Amount: 123 })
            );
            expect(mockOnComplete).toHaveBeenCalled();
        });
    });

    it('validates required fields', async () => {
        render(
            <table><tbody>
                <InlineEntryRow
                    schema={mockSchema}
                    onCancel={mockOnCancel}
                    onComplete={mockOnComplete}
                />
            </tbody></table>
        );

        // Try to save without name
        fireEvent.click(screen.getByText('Save'));

        expect(screen.getByText('Required')).toBeInTheDocument();
        expect(mockCreateEntry).not.toHaveBeenCalled();
    });

    it('cancels on Escape key', () => {
        render(
            <table><tbody>
                <InlineEntryRow
                    schema={mockSchema}
                    onCancel={mockOnCancel}
                    onComplete={mockOnComplete}
                />
            </tbody></table>
        );

        const input = screen.getByPlaceholderText(/enter name/i);
        fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('handles number input correctly', async () => {
        render(
            <table><tbody>
                <InlineEntryRow
                    schema={mockSchema}
                    onCancel={mockOnCancel}
                    onComplete={mockOnComplete}
                />
            </tbody></table>
        );

        fireEvent.change(screen.getByPlaceholderText(/enter name/i), {
            target: { value: 'Number Entry' }
        });
        const amountInput = screen.getByPlaceholderText(/enter amount/i);
        fireEvent.change(amountInput, { target: { value: '42' } });

        // Enter on last field triggers submit
        fireEvent.keyDown(amountInput, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(mockCreateEntry).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.objectContaining({ Amount: 42 })
            );
        });
    });
});
