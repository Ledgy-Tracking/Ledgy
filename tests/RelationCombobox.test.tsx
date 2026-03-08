import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RelationCombobox } from '../src/features/ledger/RelationCombobox';

describe('RelationCombobox', () => {
    const mockEntries = [
        { _id: 'entry:1', data: { Name: 'Alpha' }, type: 'entry' as const, schemaId: 's1', ledgerId: 'l1', profileId: 'p1', schemaVersion: 1, createdAt: '', updatedAt: '' },
        { _id: 'entry:2', data: { Name: 'Beta' }, type: 'entry' as const, schemaId: 's1', ledgerId: 'l1', profileId: 'p1', schemaVersion: 1, createdAt: '', updatedAt: '' },
        { _id: 'entry:3', data: { Name: 'Gamma' }, type: 'entry' as const, schemaId: 's1', ledgerId: 'l1', profileId: 'p1', schemaVersion: 1, createdAt: '', updatedAt: '' },
    ];

    it('renders trigger with placeholder initially', () => {
        render(
            <RelationCombobox
                entries={mockEntries}
                onChange={() => {}}
                placeholder="Select something..."
            />
        );
        expect(screen.getByText('Select something...')).toBeInTheDocument();
    });

    it('opens dropdown and shows entries when clicked', () => {
        render(
            <RelationCombobox
                entries={mockEntries}
                onChange={() => {}}
            />
        );
        
        fireEvent.click(screen.getByRole('button'));
        
        expect(screen.getByPlaceholderText('Search entries...')).toBeInTheDocument();
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.getByText('Beta')).toBeInTheDocument();
        expect(screen.getByText('Gamma')).toBeInTheDocument();
    });

    it('filters entries based on search term', () => {
        render(
            <RelationCombobox
                entries={mockEntries}
                onChange={() => {}}
            />
        );
        
        fireEvent.click(screen.getByRole('button'));
        const input = screen.getByPlaceholderText('Search entries...');
        
        fireEvent.change(input, { target: { value: 'Bet' } });
        
        expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
        expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('calls onChange and closes on single selection', () => {
        const onChange = vi.fn();
        render(
            <RelationCombobox
                entries={mockEntries}
                onChange={onChange}
            />
        );
        
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Beta'));
        
        expect(onChange).toHaveBeenCalledWith('entry:2');
        expect(screen.queryByPlaceholderText('Search entries...')).not.toBeInTheDocument();
    });

    it('supports multiple selection', () => {
        const onChange = vi.fn();
        render(
            <RelationCombobox
                entries={mockEntries}
                value={['entry:1']}
                onChange={onChange}
                allowMultiple
            />
        );
        
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Gamma'));
        
        // Should include both previous and new selection
        expect(onChange).toHaveBeenCalledWith(['entry:1', 'entry:3']);
        // Should stay open for multiple selection
        expect(screen.getByPlaceholderText('Search entries...')).toBeInTheDocument();
    });

    it('removes selection on clicking selected item in multiple mode', () => {
        const onChange = vi.fn();
        render(
            <RelationCombobox
                entries={mockEntries}
                value={['entry:1', 'entry:2']}
                onChange={onChange}
                allowMultiple
            />
        );
        
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Alpha'));
        
        expect(onChange).toHaveBeenCalledWith(['entry:2']);
    });

    it('handles keyboard navigation (Arrow keys and Enter)', () => {
        const onChange = vi.fn();
        render(
            <RelationCombobox
                entries={mockEntries}
                onChange={onChange}
            />
        );
        
        fireEvent.click(screen.getByRole('button'));
        const input = screen.getByPlaceholderText('Search entries...');
        
        // Move to Beta (index 1)
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'Enter' });
        
        expect(onChange).toHaveBeenCalledWith('entry:2');
    });
});
