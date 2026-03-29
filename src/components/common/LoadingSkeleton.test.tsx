import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
    it('renders correct number of skeleton items', () => {
        render(<LoadingSkeleton count={5} />);
        const container = screen.getByLabelText('Loading content');
        expect(container).toBeInTheDocument();
        // Check that there are 5 skeleton lines (Skeleton from shadcn usually has animate-pulse)
        // Let's use a more robust way to find them if animate-pulse is not guaranteed
        const skeletons = container.querySelectorAll('.rounded');
        expect(skeletons).toHaveLength(5);
    });

    it('renders with default count of 3', () => {
        render(<LoadingSkeleton />);
        const container = screen.getByLabelText('Loading content');
        const skeletons = container.querySelectorAll('.rounded');
        expect(skeletons).toHaveLength(3);
    });

    it('applies height sm class', () => {
        render(<LoadingSkeleton height="sm" />);
        const container = screen.getByLabelText('Loading content');
        expect(container.querySelector('.h-4')).toBeInTheDocument();
    });

    it('applies height md class', () => {
        render(<LoadingSkeleton height="md" />);
        const container = screen.getByLabelText('Loading content');
        expect(container.querySelector('.h-6')).toBeInTheDocument();
    });

    it('applies height lg class', () => {
        render(<LoadingSkeleton height="lg" />);
        const container = screen.getByLabelText('Loading content');
        expect(container.querySelector('.h-8')).toBeInTheDocument();
    });

    it('applies custom height string', () => {
        render(<LoadingSkeleton height="h-12" />);
        const container = screen.getByLabelText('Loading content');
        expect(container.querySelector('.h-12')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(<LoadingSkeleton className="custom-class" />);
        const outerDiv = container.firstChild;
        expect(outerDiv).toHaveClass('custom-class');
    });

    it('has correct ARIA attributes', () => {
        render(<LoadingSkeleton />);
        const container = screen.getByLabelText('Loading content');
        expect(container).toHaveAttribute('aria-label', 'Loading content');
        expect(container).toHaveAttribute('aria-busy', 'true');
    });

    it('includes sr-only loading text', () => {
        render(<LoadingSkeleton />);
        expect(screen.getByText('Loading...')).toHaveClass('sr-only');
    });

    it('uses custom aria label', () => {
        render(<LoadingSkeleton ariaLabel="Loading profiles" />);
        const container = screen.getByLabelText('Loading profiles');
        expect(container).toHaveAttribute('aria-label', 'Loading profiles');
    });
});
