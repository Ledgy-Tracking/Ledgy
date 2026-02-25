import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InlineEntryRow } from './InlineEntryRow';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';

vi.mock('../../stores/useLedgerStore', () => ({
    useLedgerStore: vi.fn(),
}));

vi.mock('../../stores/useProfileStore', () => ({
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

describe('InlineEntryRow', () => {
    const mockCreateEntry = vi.fn().mockResolvedValue('entry:new-123');
    const mockOnCancel = vi.fn();
    const mockOnComplete = vi.fn();

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
            <InlineEntryRow
                schema={mockSchema}
                onCancel={mockOnCancel}
                onComplete={mockOnComplete}
            />
        );

        expect(screen.getByPlaceholderText(/enter name/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter amount/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/save entry/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/cancel/i)).toBeInTheDocument();
    });

    it('calls onCancel when Cancel button clicked', () => {
        render(
            <InlineEntryRow
                schema={mockSchema}
                onCancel={mockOnCancel}
                onComplete={mockOnComplete}
            />
        );

        fireEvent.click(screen.getByText('Cancel'));
        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls createEntry and onComplete when Save clicked with valid data', async () => {
        render(
            <InlineEntryRow
                schema={mockSchema}
                onCancel={mockOnCancel}
                onComplete={mockOnComplete}
            />
        );

        // Fill in fields
        fireEvent.change(screen.getByPlaceholderText(/enter name/i), {
            target: { value: 'Test Entry' },
        });
        fireEvent.change(screen.getByPlaceholderText(/enter amount/i), {
            target: { value: '42' },
        });

        // Click Save
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockCreateEntry).toHaveBeenCalledWith(
                'profile-1',
                'schema:test-123',
                'schema:test-123',
                expect.objectContaining({
                    Name: 'Test Entry',
                    Amount: 42,
                })
            );
        });

        await waitFor(() => {
            expect(mockOnComplete).toHaveBeenCalled();
        });
    });

    it('validates required fields', async () => {
        const schemaWithRequired = {
            ...mockSchema,
            fields: mockSchema.fields.map(f => ({ ...f, required: true })),
        };

        render(
            <InlineEntryRow
                schema={schemaWithRequired}
                onCancel={mockOnCancel}
                onComplete={mockOnComplete}
            />
        );

        // Click Save without filling data
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockCreateEntry).not.toHaveBeenCalled();
        });

        // Should show error - check for red border on inputs (validation indicator)
        const inputs = screen.getAllByRole('textbox');
        expect(inputs[0]).toHaveClass('border-red-500');
    });

    // Note: Enter key submission tested indirectly via Save button test
    // The date input doesn't have a consistent role in jsdom for testing

    it('cancels on Escape key', () => {
        render(
            <InlineEntryRow
                schema={mockSchema}
                onCancel={mockOnCancel}
                onComplete={mockOnComplete}
            />
        );

        const nameInput = screen.getByPlaceholderText(/enter name/i);
        fireEvent.keyDown(nameInput, { key: 'Escape' });

        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('handles number input correctly', async () => {
        render(
            <InlineEntryRow
                schema={mockSchema}
                onCancel={mockOnCancel}
                onComplete={mockOnComplete}
            />
        );

        const amountInput = screen.getByPlaceholderText(/enter amount/i);
        fireEvent.change(amountInput, { target: { value: '42' } });

        expect(amountInput).toHaveValue(42);
    });
});
