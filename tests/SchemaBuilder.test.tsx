import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SchemaBuilder } from '../src/features/ledger/SchemaBuilder';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';
import { useErrorStore } from '../src/stores/useErrorStore';

// Mock the stores
vi.mock('../src/stores/useLedgerStore');
vi.mock('../src/stores/useProfileStore');
vi.mock('../src/stores/useErrorStore');

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

        (useProfileStore as any).mockReturnValue({
            activeProfileId: 'profile-1',
        });

        (useLedgerStore as any).mockReturnValue({
            createSchema: mockCreateSchema,
            isLoading: false,
            schemas: mockSchemas
        });

        (useErrorStore as any).mockReturnValue({
            dispatchError: mockDispatchError
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
        
        expect(screen.getByText('At least one field is required')).toBeInTheDocument();
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

    it('handles relation field and populates target selector', async () => {
        render(<SchemaBuilder projectId="project-1" onClose={mockOnClose} />);

        fireEvent.click(screen.getByText('Add Field'));
        
        const typeSelect = screen.getByRole('combobox');
        fireEvent.change(typeSelect, { target: { value: 'relation' } });

        // Check if the relation target selector appeared
        const targetSelects = screen.getAllByRole('combobox');
        const targetSelect = targetSelects.find(s => s.innerHTML.includes('Select Target...'));
        expect(targetSelect).toBeInTheDocument();

        // Check if only ledgers from the same project are shown
        expect(screen.getByText('Existing Ledger')).toBeInTheDocument();
        expect(screen.queryByText('Other Project Ledger')).not.toBeInTheDocument();

        // Select target
        if (targetSelect) {
            fireEvent.change(targetSelect, { target: { value: 'ledger-1' } });
        }

        // Try to save
        fireEvent.change(screen.getByPlaceholderText(/e.g. Coffee Tracker/i), {
            target: { value: 'Test Relation' }
        });
        fireEvent.change(screen.getByPlaceholderText('Field name'), {
            target: { value: 'Related' }
        });

        const saveButton = screen.getByRole('button', { name: /Create Schema/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockCreateSchema).toHaveBeenCalledWith(
                'profile-1',
                'project-1',
                'Test Relation',
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Related',
                        type: 'relation',
                        relationTarget: 'ledger-1'
                    })
                ])
            );
        });
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
        
        const typeSelect = screen.getByRole('combobox');
        fireEvent.change(typeSelect, { target: { value: 'relation' } });

        // Save without selecting target
        const saveButton = screen.getByRole('button', { name: /Create Schema/i });
        fireEvent.click(saveButton);

        expect(screen.getByText(/Relation target required/)).toBeInTheDocument();
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
            // Note: createSchema already calls dispatchError internally in the store
        });
    });
});
