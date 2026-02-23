import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NodeCanvas } from './NodeCanvas';

// Mock React Flow dependency
vi.mock('@xyflow/react', () => ({
    ReactFlow: ({ children, nodes, edges }: any) => (
        <div data-testid="react-flow" className="react-flow">
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
vi.mock('../../stores/useNodeStore', () => ({
    useNodeStore: {
        getState: vi.fn(),
        subscribe: vi.fn(),
        setState: vi.fn(),
    },
}));

vi.mock('../../stores/useProfileStore', () => ({
    useProfileStore: {
        getState: vi.fn(() => ({ activeProfileId: 'test-profile' })),
        subscribe: vi.fn(),
        setState: vi.fn(),
    },
}));

describe('NodeCanvas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock store states
        (useNodeStore.getState as any).mockReturnValue({
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            loadCanvas: vi.fn(),
            saveCanvas: vi.fn(),
            setNodes: vi.fn(),
            setEdges: vi.fn(),
            setViewport: vi.fn(),
        });
    });

    it('renders empty canvas guide when no nodes exist', () => {
        render(
            <BrowserRouter>
                <NodeCanvas />
            </BrowserRouter>
        );

        expect(screen.getByText('Welcome to Node Forge')).toBeInTheDocument();
        expect(screen.getByText('Add Your First Node')).toBeInTheDocument();
        expect(screen.getByText('Connect Nodes')).toBeInTheDocument();
        expect(screen.getByText('Navigate Canvas')).toBeInTheDocument();
    });

    it('renders React Flow canvas with background and controls', () => {
        render(
            <BrowserRouter>
                <NodeCanvas />
            </BrowserRouter>
        );

        // React Flow should be present
        const reactFlowContainer = screen.getByTestId('react-flow');
        expect(reactFlowContainer).toBeInTheDocument();
        expect(reactFlowContainer).toHaveClass('react-flow');

        // Background should be present
        expect(document.querySelector('.react-flow__background')).toBeInTheDocument();

        // Controls should be present
        expect(document.querySelector('.react-flow__controls')).toBeInTheDocument();

        // MiniMap should be present
        expect(document.querySelector('.react-flow__minimap')).toBeInTheDocument();
    });

    it('loads canvas on mount with active profile', async () => {
        const loadCanvasMock = vi.fn();
        (useNodeStore.getState as any).mockReturnValue({
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            loadCanvas: loadCanvasMock,
            saveCanvas: vi.fn(),
            setNodes: vi.fn(),
            setEdges: vi.fn(),
            setViewport: vi.fn(),
        });

        render(
            <BrowserRouter>
                <NodeCanvas />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(loadCanvasMock).toHaveBeenCalledWith('test-profile', 'default');
        });
    });

    it('displays EmptyCanvasGuide overlay on empty canvas', () => {
        render(
            <BrowserRouter>
                <NodeCanvas />
            </BrowserRouter>
        );

        const guideElement = screen.getByText('Welcome to Node Forge');
        expect(guideElement).toBeInTheDocument();
    });

    it('hides empty guide when nodes are present', () => {
        (useNodeStore.getState as any).mockReturnValue({
            nodes: [{ id: '1', type: 'ledgerSource', position: { x: 0, y: 0 } }],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            loadCanvas: vi.fn(),
            saveCanvas: vi.fn(),
            setNodes: vi.fn(),
            setEdges: vi.fn(),
            setViewport: vi.fn(),
        });

        render(
            <BrowserRouter>
                <NodeCanvas />
            </BrowserRouter>
        );

        expect(screen.queryByText('Welcome to Node Forge')).not.toBeInTheDocument();
    });

    it('has proper canvas styling', () => {
        render(
            <BrowserRouter>
                <NodeCanvas />
            </BrowserRouter>
        );

        const reactFlowContainer = screen.getByTestId('react-flow');
        expect(reactFlowContainer).toHaveClass('bg-zinc-950');
    });
});
