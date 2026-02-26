import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../src/features/dashboard/Dashboard';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as useLedgerStoreModule from '../src/stores/useLedgerStore';
import * as useUIStoreModule from '../src/stores/useUIStore';
import * as useDashboardStoreModule from '../src/stores/useDashboardStore';
import * as useNodeStoreModule from '../src/stores/useNodeStore';
import * as useProfileStoreModule from '../src/stores/useProfileStore';

// Mock the stores
vi.mock('../src/stores/useLedgerStore');
vi.mock('../src/stores/useUIStore');
vi.mock('../src/stores/useDashboardStore');
vi.mock('../src/stores/useNodeStore');
vi.mock('../src/stores/useProfileStore');

// Mock react-grid-layout
vi.mock('react-grid-layout', () => {
    return {
        Responsive: ({ children }: any) => <div>{children}</div>,
        WidthProvider: (Component: any) => Component,
    };
});

describe('Dashboard Component', () => {
    const mockSetSchemaBuilderOpen = vi.fn();
    const mockFetchSchemas = vi.fn();
    const mockToggleRightInspector = vi.fn();
    const mockFetchWidgets = vi.fn().mockResolvedValue(undefined);

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

        // Dashboard Store Mock
        (useDashboardStoreModule.useDashboardStore as any).mockReturnValue({
            widgets: [],
            fetchWidgets: mockFetchWidgets,
            saveWidgets: vi.fn(),
            addWidget: vi.fn(),
            removeWidget: vi.fn(),
        });

        // Node Store Mock
        (useNodeStoreModule.useNodeStore as any).mockReturnValue({
            nodes: [],
        });

        // Profile Store Mock
        (useProfileStoreModule.useProfileStore as any).mockReturnValue({
            activeProfileId: 'profile1',
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders empty dashboard initially', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1/project/proj1']}>
                <Routes>
                    <Route path="/app/:profileId/project/:projectId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('LEDGY')).toBeInTheDocument();
        expect(screen.getByText('Welcome to Ledgy!')).toBeInTheDocument();
        expect(mockFetchSchemas).toHaveBeenCalledWith('profile1');
    });

    it('opens Schema Builder when clicking Create Ledger', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1/project/proj1']}>
                <Routes>
                    <Route path="/app/:profileId/project/:projectId" element={<Dashboard />} />
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
                { _id: 'ledger1', name: 'My Ledger', projectId: 'proj1', fields: [] },
                { _id: 'ledger2', name: 'Another Ledger', projectId: 'proj1', fields: [] }
            ],
            fetchSchemas: mockFetchSchemas,
        });

        render(
            <MemoryRouter initialEntries={['/app/profile1/project/proj1']}>
                <Routes>
                    <Route path="/app/:profileId/project/:projectId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('LEDGY')).toBeInTheDocument();
        expect(screen.queryByText('Welcome to Ledgy!')).not.toBeInTheDocument();
        
        // Check for ledger selector
        expect(screen.getByRole('combobox', { name: /Select ledger/i })).toBeInTheDocument();
        expect(screen.getByText('My Ledger')).toBeInTheDocument();
        expect(screen.getByText('Another Ledger')).toBeInTheDocument();
    });

    it('switches to grid view when toggle is clicked', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1/project/proj1']}>
                <Routes>
                    <Route path="/app/:profileId/project/:projectId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        const gridBtn = screen.getByTitle('Metric Grid');
        fireEvent.click(gridBtn);

        expect(screen.getByText('Add Widget')).toBeInTheDocument();
        expect(mockFetchWidgets).toHaveBeenCalled();
    });
});
