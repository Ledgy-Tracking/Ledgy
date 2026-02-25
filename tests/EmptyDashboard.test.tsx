import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyDashboard } from '../src/features/dashboard/EmptyDashboard';

describe('EmptyDashboard', () => {
    it('renders the welcome message and CTA', () => {
        const mockAction = vi.fn();
        render(<EmptyDashboard onActionClick={mockAction} />);

        expect(screen.getByText('Welcome to Ledgy!')).toBeInTheDocument();
        expect(screen.getByText(/Create your first ledger to get started/)).toBeInTheDocument();

        const button = screen.getByRole('button', { name: /Create new ledger/i });
        expect(button).toBeInTheDocument();

        fireEvent.click(button);
        expect(mockAction).toHaveBeenCalledTimes(1);
    });
});
