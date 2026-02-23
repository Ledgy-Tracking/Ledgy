import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

describe('Dashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

    it('opens Schema Builder when clicking Create Project', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1']}>
                <Routes>
                    <Route path="/app/:profileId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        const createBtn = screen.getByRole('button', { name: /Create your first project/i });
        fireEvent.click(createBtn);

        // Schema Builder modal should appear
        expect(screen.getByText('Create Ledger Schema')).toBeInTheDocument();
    });
});
