import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NodeCanvas } from '../src/features/nodeEditor/NodeCanvas';
import { useNodeStore } from '../src/stores/useNodeStore';
import { useProfileStore } from '../src/stores/useProfileStore';

// Mock React Flow dependency
vi.mock('@xyflow/react', () => ({
    ReactFlow: ({ children, nodes, edges, className }: any) => (
        <div data-testid="react-flow" className={className}>
            {children}
            <div className="react-flow__background" />
            <div className="react-flow__controls" />
            <div className="react-flow__minimap" />
        </div>
    ),
    Background: ({ children }: any) => <div className="react-flow__background">{children}</div>,
    Controls: ({ children }: any) => <div className="react-flow__controls">{children}</div>,
    MiniMap: ({ children }: any) => <div className="react-flow__minimap">{children}</div>,
    useNodesState: (initialNodes: any) => [initialNodes, vi.fn(), vi.fn()],
    useEdgesState: (initialEdges: any) => [initialEdges, vi.fn(), vi.fn()],
    addEdge: (connection: any, edges: any) => [...edges, connection],
    Connection: {},
    Edge: {},
    Node: {},
}));

// Mock the stores
vi.mock('../src/stores/useNodeStore', () => ({
    useNodeStore: Object.assign(vi.fn(), {
        getState: vi.fn(),
        subscribe: vi.fn(),
        setState: vi.fn(),
    }),
}));

vi.mock('../src/stores/useProfileStore', () => ({
    useProfileStore: Object.assign(vi.fn(), {
        getState: vi.fn(() => ({ activeProfileId: 'test-profile' })),
        subscribe: vi.fn(),
        setState: vi.fn(),
    }),
}));

describe('NodeCanvas', () => {
    const mockUseNodeStore = vi.mocked(useNodeStore);
    const mockUseProfileStore = vi.mocked(useProfileStore);

    beforeEach(() => {
        vi.clearAllMocks();
        
        const mockState = {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            isLoading: false,
            loadCanvas: vi.fn(),
            saveCanvas: vi.fn(),
            setNodes: vi.fn(),
            setEdges: vi.fn(),
            setViewport: vi.fn(),
        };

        mockUseNodeStore.mockReturnValue(mockState);
        (mockUseNodeStore.getState as any).mockReturnValue(mockState);
        
        mockUseProfileStore.mockReturnValue({
            activeProfileId: 'test-profile',
        });
    });

    it('renders empty canvas guide when no nodes exist', () => {
        render(
            <MemoryRouter initialEntries={['/project/test-project/node-forge']}>
                <Routes>
                    <Route path="/project/:projectId/node-forge" element={<NodeCanvas />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Welcome to Node Forge')).toBeInTheDocument();
        expect(screen.getByText(/Drop a Ledger Node/i)).toBeInTheDocument();
        expect(screen.getByText('Connect Nodes')).toBeInTheDocument();
        expect(screen.getByText('Navigate Canvas')).toBeInTheDocument();
    });

    it('renders React Flow canvas with background and controls', () => {
        render(
            <MemoryRouter initialEntries={['/project/test-project/node-forge']}>
                <Routes>
                    <Route path="/project/:projectId/node-forge" element={<NodeCanvas />} />
                </Routes>
            </MemoryRouter>
        );

        // React Flow should be present
        const reactFlowContainer = screen.getByTestId('react-flow');
        expect(reactFlowContainer).toBeInTheDocument();
        expect(reactFlowContainer).toHaveClass('bg-zinc-950');

        // Background should be present
        expect(document.querySelector('.react-flow__background')).toBeInTheDocument();

        // Controls should be present
        expect(document.querySelector('.react-flow__controls')).toBeInTheDocument();

        // MiniMap should be present
        expect(document.querySelector('.react-flow__minimap')).toBeInTheDocument();
    });

    it('loads canvas on mount with active profile', async () => {
        const loadCanvasMock = vi.fn();
        const mockState = {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            isLoading: false,
            loadCanvas: loadCanvasMock,
            saveCanvas: vi.fn(),
            setNodes: vi.fn(),
            setEdges: vi.fn(),
            setViewport: vi.fn(),
        };
        mockUseNodeStore.mockReturnValue(mockState);
        (mockUseNodeStore.getState as any).mockReturnValue(mockState);

        render(
            <MemoryRouter initialEntries={['/project/test-project/node-forge']}>
                <Routes>
                    <Route path="/project/:projectId/node-forge" element={<NodeCanvas />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(loadCanvasMock).toHaveBeenCalledWith('test-profile', 'test-project');
        });
    });

    it('hides empty guide when nodes are present', () => {
        const mockState = {
            nodes: [{ id: '1', type: 'ledgerSource', position: { x: 0, y: 0 } }],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            isLoading: false,
            loadCanvas: vi.fn(),
            saveCanvas: vi.fn(),
            setNodes: vi.fn(),
            setEdges: vi.fn(),
            setViewport: vi.fn(),
        };
        mockUseNodeStore.mockReturnValue(mockState);
        (mockUseNodeStore.getState as any).mockReturnValue(mockState);

        render(
            <MemoryRouter initialEntries={['/project/test-project/node-forge']}>
                <Routes>
                    <Route path="/project/:projectId/node-forge" element={<NodeCanvas />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.queryByText('Welcome to Node Forge')).not.toBeInTheDocument();
    });

    it('has proper canvas styling', () => {
        render(
            <MemoryRouter initialEntries={['/project/test-project/node-forge']}>
                <Routes>
                    <Route path="/project/:projectId/node-forge" element={<NodeCanvas />} />
                </Routes>
            </MemoryRouter>
        );

        const reactFlowContainer = screen.getByTestId('react-flow');
        expect(reactFlowContainer).toHaveClass('bg-zinc-950');
    });
});
