import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RelationTagChip } from './RelationTagChip';

const renderWithRouter = (component: React.ReactElement) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('RelationTagChip', () => {
    it('renders single relation value', () => {
        renderWithRouter(
            <RelationTagChip value="entry:123" targetLedgerId="ledger:abc" />
        );
        expect(screen.getByText('entry:123')).toBeInTheDocument();
    });

    it('renders multiple relation values as chips', () => {
        renderWithRouter(
            <RelationTagChip value={['entry:123', 'entry:456']} targetLedgerId="ledger:abc" />
        );
        expect(screen.getByText('entry:123')).toBeInTheDocument();
        expect(screen.getByText('entry:456')).toBeInTheDocument();
    });

    it('renders placeholder for empty value', () => {
        renderWithRouter(
            <RelationTagChip value={[]} targetLedgerId="ledger:abc" />
        );
        expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders ghost state with line-through styling', () => {
        renderWithRouter(
            <RelationTagChip value="entry:deleted" isGhost />
        );
        const button = screen.getByRole('button');
        // Check for ghost state classes on the button
        expect(button.className).toContain('line-through');
        expect(button.className).toContain('cursor-not-allowed');
    });

    it('disables click on ghost chips', () => {
        const onClick = vi.fn();
        renderWithRouter(
            <RelationTagChip value="entry:deleted" isGhost onClick={onClick} />
        );
        const chip = screen.getByText('entry:deleted');
        fireEvent.click(chip);
        expect(onClick).not.toHaveBeenCalled();
    });

    it('calls onClick when chip is clicked', () => {
        const onClick = vi.fn();
        renderWithRouter(
            <RelationTagChip value="entry:123" targetLedgerId="ledger:abc" onClick={onClick} />
        );
        const chip = screen.getByText('entry:123');
        fireEvent.click(chip);
        expect(onClick).toHaveBeenCalled();
    });

    it('displays ExternalLink icon for non-ghost chips', () => {
        renderWithRouter(
            <RelationTagChip value="entry:123" targetLedgerId="ledger:abc" />
        );
        // The ExternalLink icon should be present
        const icon = document.querySelector('svg');
        expect(icon).toBeInTheDocument();
    });

    it('does not display ExternalLink icon for ghost chips', () => {
        renderWithRouter(
            <RelationTagChip value="entry:deleted" isGhost />
        );
        // Should not have the ExternalLink icon
        const buttons = screen.getAllByRole('button');
        expect(buttons[0].querySelector('svg')).not.toBeInTheDocument();
    });

    it('applies truncate class to long values', () => {
        const longValue = 'entry:very-long-id-that-should-be-truncated-because-it-exceeds-max-width';
        renderWithRouter(
            <RelationTagChip value={longValue} targetLedgerId="ledger:abc" />
        );
        const chip = screen.getByText(longValue);
        expect(chip.className).toContain('truncate');
    });
});
