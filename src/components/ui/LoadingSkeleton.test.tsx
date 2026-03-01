import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
    it('renders correct number of skeleton items', () => {
        render(<LoadingSkeleton count={5} />);
        const skeletonItems = screen.getAllByRole('status');
        expect(skeletonItems).toHaveLength(1);
        // Check that there are 5 skeleton lines
        const container = skeletonItems[0];
        expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5);
    });

    it('renders with default count of 3', () => {
        render(<LoadingSkeleton />);
        const container = screen.getByRole('status');
        expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
    });

    it('applies height sm class', () => {
        render(<LoadingSkeleton height="sm" />);
        const container = screen.getByRole('status');
        expect(container.querySelector('.h-4')).toBeInTheDocument();
    });

    it('applies height md class', () => {
        render(<LoadingSkeleton height="md" />);
        const container = screen.getByRole('status');
        expect(container.querySelector('.h-6')).toBeInTheDocument();
    });

    it('applies height lg class', () => {
        render(<LoadingSkeleton height="lg" />);
        const container = screen.getByRole('status');
        expect(container.querySelector('.h-8')).toBeInTheDocument();
    });

    it('applies custom height string', () => {
        render(<LoadingSkeleton height="h-12" />);
        const container = screen.getByRole('status');
        expect(container.querySelector('.h-12')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(<LoadingSkeleton className="custom-class" />);
        const container = screen.getByRole('status');
        expect(container).toHaveClass('custom-class');
    });

    it('has correct ARIA attributes', () => {
        render(<LoadingSkeleton />);
        const statusElement = screen.getByRole('status');
        expect(statusElement).toHaveAttribute('aria-label', 'Loading content');
        expect(statusElement).toHaveAttribute('aria-busy', 'true');
    });

    it('includes sr-only loading text', () => {
        render(<LoadingSkeleton />);
        expect(screen.getByText('Loading...')).toHaveClass('sr-only');
    });

    it('uses custom aria label', () => {
        render(<LoadingSkeleton ariaLabel="Loading profiles" />);
        const statusElement = screen.getByRole('status');
        expect(statusElement).toHaveAttribute('aria-label', 'Loading profiles');
    });
});
