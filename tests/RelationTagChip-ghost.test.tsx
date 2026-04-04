import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { RelationTagChip } from '../src/features/ledger/RelationTagChip';
import { BrowserRouter } from 'react-router-dom';

const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('RelationTagChip - Ghost Reference Styling', () => {
    describe('AC 3: Visual styling for ghosts', () => {
        it('applies correct ghost styling: bg-zinc-800, border-zinc-700, text-zinc-500, line-through', () => {
            const { container } = renderWithRouter(
                <RelationTagChip
                    value="entry-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                />
            );

            const badge = container.querySelector('[data-slot="badge"]');
            expect(badge).toHaveClass('bg-zinc-800');
            expect(badge).toHaveClass('border-zinc-700');
            expect(badge).toHaveClass('text-zinc-500');
            expect(badge).toHaveClass('line-through');
        });

        it('sets cursor to not-allowed for ghosts', () => {
            const { container } = renderWithRouter(
                <RelationTagChip
                    value="entry-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                />
            );

            const badge = container.querySelector('[data-slot="badge"]');
            expect(badge).toHaveClass('cursor-not-allowed');
        });

        it('hides external link icon for ghosts', () => {
            const { container } = renderWithRouter(
                <RelationTagChip
                    value="entry-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                />
            );

            const icon = container.querySelector('svg');
            expect(icon).toBeNull();
        });

        it('shows external link icon for active (non-ghost) references', () => {
            const { container } = renderWithRouter(
                <RelationTagChip
                    value="entry-123"
                    targetLedgerId="schema:target"
                    isGhost={false}
                />
            );

            const icon = container.querySelector('svg');
            expect(icon).not.toBeNull();
        });
    });

    describe('AC 5: Navigation prevented on ghost', () => {
        it('prevents navigation when clicking ghost reference', () => {
            const onClick = vi.fn();
            const { container } = renderWithRouter(
                <RelationTagChip
                    value="entry-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                    onClick={onClick}
                />
            );

            const badge = container.querySelector('[data-slot="badge"]');
            fireEvent.click(badge!);

            expect(onClick).not.toHaveBeenCalled();
        });

        it('button is disabled when isGhost=true', () => {
            const { container } = renderWithRouter(
                <RelationTagChip
                    value="entry-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                />
            );

            const badge = container.querySelector('[data-slot="badge"]');
            expect(badge).toHaveAttribute('aria-disabled', 'true');
        });
    });

    describe('AC 13: Accessibility', () => {
        it('has disabled and aria-disabled attributes for ghosts', () => {
            const { container } = renderWithRouter(
                <RelationTagChip
                    value="entry-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                />
            );

            const badge = container.querySelector('[data-slot="badge"]');
            expect(badge).toHaveAttribute('aria-disabled', 'true');
        });
    });
});
