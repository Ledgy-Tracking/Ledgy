import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyCanvasGuide } from '../src/features/nodeEditor/EmptyCanvasGuide';

describe('EmptyCanvasGuide', () => {
    it('renders welcome message', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.getByText('Welcome to Node Forge')).toBeInTheDocument();
    });

    it('displays onboarding instructions', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.getByText(/Create visual automations/)).toBeInTheDocument();
    });

    it('shows interactive "Drop a Ledger Node" button when callback provided', () => {
        const mockOnAdd = vi.fn();
        render(<EmptyCanvasGuide onAddFirstNode={mockOnAdd} />);
        
        const btn = screen.getByRole('button', { name: /Drop a Ledger Node/i });
        expect(btn).toBeInTheDocument();
        
        fireEvent.click(btn);
        expect(mockOnAdd).toHaveBeenCalled();
    });

    it('hides button when no callback provided', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.queryByRole('button', { name: /Drop a Ledger Node/i })).not.toBeInTheDocument();
    });

    it('shows "Connect Nodes" guidance', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.getByText('Connect Nodes')).toBeInTheDocument();
        expect(screen.getByText(/Drag from output ports/)).toBeInTheDocument();
    });

    it('shows "Navigate Canvas" guidance', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.getByText('Navigate Canvas')).toBeInTheDocument();
        expect(screen.getByText(/Space/)).toBeInTheDocument();
    });

    it('has proper styling with emerald accent color', () => {
        render(<EmptyCanvasGuide />);
        
        const title = screen.getByText('Welcome to Node Forge');
        expect(title).toHaveClass('text-emerald-400');
    });

    it('has dark theme styling', () => {
        render(<EmptyCanvasGuide />);
        
        const guideCard = screen.getByText('Welcome to Node Forge').closest('div');
        expect(guideCard).toHaveClass('bg-zinc-950/90');
        expect(guideCard).toHaveClass('border-zinc-800');
    });

    it('uses pointer-events-auto to allow button interaction', () => {
        const { container } = render(<EmptyCanvasGuide />);
        
        const overlay = container.firstChild;
        expect(overlay).toHaveClass('pointer-events-auto');
    });

    it('has proper z-index to appear above canvas', () => {
        const { container } = render(<EmptyCanvasGuide />);
        
        const overlay = container.firstChild;
        expect(overlay).toHaveClass('z-10');
    });

    it('renders two guidance cards', () => {
        render(<EmptyCanvasGuide />);
        
        const guidanceCards = screen.getAllByText(/^(Connect Nodes|Navigate Canvas)$/);
        expect(guidanceCards).toHaveLength(2);
    });

    it('displays keyboard shortcut hint', () => {
        render(<EmptyCanvasGuide />);
        
        const kbdElement = screen.getByText('Space');
        expect(kbdElement.tagName).toBe('KBD');
        expect(kbdElement).toHaveClass('bg-zinc-800');
    });
});
