import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

describe('Dashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.alert
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders empty dashboard initially', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1']}>
                <Routes>
                    <Route path="/app/:profileId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Welcome to Ledgy!')).toBeInTheDocument();
    });

    it('shows alert when creating a ledger (placeholder for Epic 3)', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1']}>
                <Routes>
                    <Route path="/app/:profileId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        const createBtn = screen.getByRole('button', { name: /Create Ledger/i });
        fireEvent.click(createBtn);

        expect(window.alert).toHaveBeenCalledWith(
            'Schema Builder will be available in Epic 3. This will let you define custom ledger schemas with field types.'
        );
    });
});
