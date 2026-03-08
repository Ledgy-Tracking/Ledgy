import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
    it('renders title correctly', () => {
        render(<EmptyState title="No items found" />);
        expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
        render(
            <EmptyState
                title="No items found"
                description="Try adjusting your filters"
            />
        );
        expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });

    it('renders action button when actionLabel and onAction provided', () => {
        const onAction = vi.fn();
        render(
            <EmptyState
                title="No items found"
                description="Create one to continue"
                actionLabel="Create Item"
                onAction={onAction}
            />
        );
        expect(screen.getByText('Create Item')).toBeInTheDocument();
    });

    it('calls onAction when button is clicked', () => {
        const onAction = vi.fn();
        render(
            <EmptyState
                title="No items found"
                actionLabel="Create Item"
                onAction={onAction}
            />
        );
        screen.getByText('Create Item').click();
        expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('renders icon when provided', () => {
        render(
            <EmptyState
                title="No items found"
                icon={<svg data-testid="test-icon" />}
            />
        );
        expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(
            <EmptyState
                title="No items found"
                className="custom-class"
            />
        );
        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('has correct ARIA attributes', () => {
        render(<EmptyState title="No items found" />);
        const statusElement = screen.getByRole('status');
        expect(statusElement).toHaveAttribute('aria-label', 'No items found');
    });

    it('does not render button without onAction', () => {
        render(
            <EmptyState
                title="No items found"
                actionLabel="Create Item"
            />
        );
        expect(screen.queryByText('Create Item')).not.toBeInTheDocument();
    });
});
