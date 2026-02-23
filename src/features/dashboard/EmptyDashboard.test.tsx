import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyDashboard } from './EmptyDashboard';

describe('EmptyDashboard', () => {
    it('renders the welcome message and CTA', () => {
        const mockAction = vi.fn();
        render(<EmptyDashboard onActionClick={mockAction} />);

        expect(screen.getByText('Welcome to Ledgy!')).toBeInTheDocument();
        expect(screen.getByText(/Create your first project to get started/)).toBeInTheDocument();

        const button = screen.getByRole('button', { name: /Create your first project/i });
        expect(button).toBeInTheDocument();

        fireEvent.click(button);
        expect(mockAction).toHaveBeenCalledTimes(1);
    });
});
