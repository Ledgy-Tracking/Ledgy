import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SchemaBuilder } from '../src/features/ledger/SchemaBuilder';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';
import { useErrorStore } from '../src/stores/useErrorStore';
import { useSchemaBuilderStore } from '../src/stores/useSchemaBuilderStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../src/components/ui/dialog';

// Mock the external stores
vi.mock('../src/stores/useLedgerStore');
vi.mock('../src/stores/useProfileStore');
vi.mock('../src/stores/useErrorStore');

// Mock Radix UI Dialog to avoid focus-trap/portal issues in jsdom
vi.mock('../src/components/ui/dialog', () => ({
    Dialog: ({ children, open }: any) => open ? <Dialog>{children}</Dialog> : null,
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

describe('SchemaBuilder Component', () => {
    const mockOnClose = vi.fn();
    const mockCreateSchema = vi.fn();
    const mockDispatchError = vi.fn();

    const mockSchemas = [
        { _id: 'ledger-1', name: 'Existing Ledger', projectId: 'project-1' },
        { _id: 'ledger-2', name: 'Other Project Ledger', projectId: 'project-2' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset the real useSchemaBuilderStore before each test
        useSchemaBuilderStore.getState().discard();

        (useProfileStore as any).mockReturnValue({
            activeProfileId: 'profile-1',
        });

        (useLedgerStore as any).mockReturnValue({
            isLoading: false,
            schemas: mockSchemas
        });
        // Allow commit() to call useLedgerStore.getState().createSchema(...)
        (useLedgerStore as any).getState = vi.fn().mockReturnValue({
            createSchema: mockCreateSchema,
            schemas: mockSchemas,
        });

        (useErrorStore as any).mockReturnValue({
            dispatchError: mockDispatchError
        });
        // Allow commit() to call useErrorStore.getState().dispatchError(...)
        (useErrorStore as any).getState = vi.fn().mockReturnValue({
            dispatchError: mockDispatchError,
        });
    });

    it('renders the schema builder form', () => {
        render(<SchemaBuilder projectId="project-1" onClose={mockOnClose} />);

        expect(screen.getByText('Create Ledger Schema')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g. Coffee Tracker/i)).toBeInTheDocument();
        expect(screen.getByText('Add Field')).toBeInTheDocument();
    });

    it('validates required fields and dispatches errors', async () => {
        render(<SchemaBuilder projectId="project-1" onClose={mockOnClose} />);

        // Set name but no fields
        fireEvent.change(screen.getByPlaceholderText(/e.g. Coffee Tracker/i), {
            target: { value: 'My Ledger' }
        });
        
        const saveButton = screen.getByRole('button', { name: /Create Schema/i });
        fireEvent.click(saveButton);
        
        await waitFor(() => {
            expect(screen.getByText('At least one field is required')).toBeInTheDocument();
        });
        expect(mockDispatchError).toHaveBeenCalledWith('At least one field is required');
    });

    it('can add and remove fields', () => {
        render(<SchemaBuilder projectId="project-1" onClose={mockOnClose} />);

        const addFieldBtn = screen.getByText('Add Field');
        fireEvent.click(addFieldBtn);

        expect(screen.getByPlaceholderText('Field name')).toBeInTheDocument();
        
        const buttons = screen.getAllByRole('button');
        const removeBtn = buttons.find(b => b.querySelector('.lucide-trash2'));
        
        if (removeBtn) {
            fireEvent.click(removeBtn);
        }
        
        expect(screen.queryByPlaceholderText('Field name')).not.toBeInTheDocument();
    });

    it('validates relation target is selected', async () => {
        render(<SchemaBuilder projectId="project-1" onClose={mockOnClose} />);

        fireEvent.change(screen.getByPlaceholderText(/e.g. Coffee Tracker/i), {
            target: { value: 'Broken Relation' }
        });
        fireEvent.click(screen.getByText('Add Field'));
        fireEvent.change(screen.getByPlaceholderText('Field name'), {
            target: { value: 'Ref' }
        });
        
        const typeSelects = screen.getAllByRole('combobox');
        fireEvent.click(typeSelects[0]);

        const relationOption = await screen.findByRole('option', { name: 'Relation' });
        fireEvent.click(relationOption);

        // Save without selecting target (the second combobox now exists but is empty)
        const saveButton = screen.getByRole('button', { name: /Create Schema/i });
        fireEvent.click(saveButton);

        expect(await screen.findByText(/Relation target required/)).toBeInTheDocument();
        expect(mockDispatchError).toHaveBeenCalledWith('Relation target required for field "Ref"');
    });

    it('handles API errors and dispatches them', async () => {
        mockCreateSchema.mockRejectedValue(new Error('PouchDB Error'));

        render(<SchemaBuilder projectId="project-1" onClose={mockOnClose} />);

        fireEvent.change(screen.getByPlaceholderText(/e.g. Coffee Tracker/i), {
            target: { value: 'Error Ledger' }
        });
        fireEvent.click(screen.getByText('Add Field'));
        fireEvent.change(screen.getByPlaceholderText('Field name'), {
            target: { value: 'Field1' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Create Schema/i }));

        await waitFor(() => {
            expect(screen.getByText('PouchDB Error')).toBeInTheDocument();
        });
    });
});
