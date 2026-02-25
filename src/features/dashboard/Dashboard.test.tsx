import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as useLedgerStoreModule from '../../stores/useLedgerStore';
import * as useUIStoreModule from '../../stores/useUIStore';

// Mock the stores
vi.mock('../../stores/useLedgerStore');
vi.mock('../../stores/useUIStore');

describe('Dashboard Component', () => {
    const mockSetSchemaBuilderOpen = vi.fn();
    const mockFetchSchemas = vi.fn();
    const mockToggleRightInspector = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Default UI Store Mock
        (useUIStoreModule.useUIStore as any).mockReturnValue({
            toggleRightInspector: mockToggleRightInspector,
            rightInspectorOpen: false,
            schemaBuilderOpen: false,
            setSchemaBuilderOpen: mockSetSchemaBuilderOpen,
        });

        // Default Ledger Store Mock (Empty)
        (useLedgerStoreModule.useLedgerStore as any).mockReturnValue({
            schemas: [],
            fetchSchemas: mockFetchSchemas,
        });
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
        expect(mockFetchSchemas).toHaveBeenCalledWith('profile1');
    });

    it('opens Schema Builder when clicking Create Ledger', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1']}>
                <Routes>
                    <Route path="/app/:profileId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        const createBtn = screen.getByRole('button', { name: /Create new ledger/i });
        fireEvent.click(createBtn);

        expect(mockSetSchemaBuilderOpen).toHaveBeenCalledWith(true);
    });

    it('renders ledger list when schemas exist', () => {
        // Mock populated store
        (useLedgerStoreModule.useLedgerStore as any).mockReturnValue({
            schemas: [
                { _id: 'ledger1', name: 'My Ledger', ledgerId: 'l1', fields: [] },
                { _id: 'ledger2', name: 'Another Ledger', ledgerId: 'l2', fields: [] }
            ],
            fetchSchemas: mockFetchSchemas,
        });

        render(
            <MemoryRouter initialEntries={['/app/profile1']}>
                <Routes>
                    <Route path="/app/:profileId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.queryByText('Welcome to Ledgy!')).not.toBeInTheDocument();
        
        // Check for ledger selector
        expect(screen.getByRole('combobox', { name: /Select ledger/i })).toBeInTheDocument();
        expect(screen.getByText('My Ledger')).toBeInTheDocument();
        expect(screen.getByText('Another Ledger')).toBeInTheDocument();
    });
});
