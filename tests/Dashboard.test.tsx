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

    it('renders dashboard header', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1/project/proj1']}>
                <Routes>
                    <Route path="/app/:profileId/project/:projectId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Add Widget')).toBeInTheDocument();
    });

    it('shows loading state while fetching widgets', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1/project/proj1']}>
                <Routes>
                    <Route path="/app/:profileId/project/:projectId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    it('calls fetchWidgets on mount', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1/project/proj1']}>
                <Routes>
                    <Route path="/app/:profileId/project/:projectId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        expect(mockFetchWidgets).toHaveBeenCalled();
    });

    it('opens widget type dropdown when Add Widget is clicked', () => {
        render(
            <MemoryRouter initialEntries={['/app/profile1/project/proj1']}>
                <Routes>
                    <Route path="/app/:profileId/project/:projectId" element={<Dashboard />} />
                </Routes>
            </MemoryRouter>
        );

        const addWidgetBtn = screen.getByText('Add Widget');
        fireEvent.click(addWidgetBtn);

        expect(screen.getByText('Chart Widget')).toBeInTheDocument();
        expect(screen.getByText('Trend Widget')).toBeInTheDocument();
        expect(screen.getByText('Text Widget')).toBeInTheDocument();
    });
});
