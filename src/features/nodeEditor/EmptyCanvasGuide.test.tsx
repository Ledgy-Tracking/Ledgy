import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyCanvasGuide } from './EmptyCanvasGuide';

describe('EmptyCanvasGuide', () => {
    it('renders welcome message', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.getByText('Welcome to Node Forge')).toBeInTheDocument();
    });

    it('displays onboarding instructions', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.getByText(/Create visual automations/)).toBeInTheDocument();
    });

    it('shows "Add Your First Node" guidance', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.getByText('Add Your First Node')).toBeInTheDocument();
        expect(screen.getByText(/Drag a ledger source node/)).toBeInTheDocument();
    });

    it('shows "Connect Nodes" guidance', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.getByText('Connect Nodes')).toBeInTheDocument();
        expect(screen.getByText(/Drag from output ports/)).toBeInTheDocument();
    });

    it('shows "Navigate Canvas" guidance', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.getByText('Navigate Canvas')).toBeInTheDocument();
        expect(screen.getByText('Space')).toBeInTheDocument();
    });

    it('has proper styling with emerald accent color', () => {
        const { container } = render(<EmptyCanvasGuide />);
        
        const title = screen.getByText('Welcome to Node Forge');
        expect(title).toHaveClass('text-emerald-400');
    });

    it('has dark theme styling', () => {
        const { container } = render(<EmptyCanvasGuide />);
        
        const guideCard = screen.getByText('Welcome to Node Forge').closest('div');
        expect(guideCard).toHaveClass('bg-zinc-900/90');
        expect(guideCard).toHaveClass('border-zinc-800');
    });

    it('displays helper note about guide disappearing', () => {
        render(<EmptyCanvasGuide />);
        
        expect(screen.getByText(/This guide will disappear/)).toBeInTheDocument();
    });

    it('uses pointer-events-none to allow canvas interaction', () => {
        const { container } = render(<EmptyCanvasGuide />);
        
        const overlay = container.firstChild;
        expect(overlay).toHaveClass('pointer-events-none');
    });

    it('has proper z-index to appear above canvas', () => {
        const { container } = render(<EmptyCanvasGuide />);
        
        const overlay = container.firstChild;
        expect(overlay).toHaveClass('z-10');
    });

    it('renders three guidance cards', () => {
        render(<EmptyCanvasGuide />);
        
        const guidanceCards = screen.getAllByText(/^(Add Your First Node|Connect Nodes|Navigate Canvas)$/);
        expect(guidanceCards).toHaveLength(3);
    });

    it('displays keyboard shortcut hint', () => {
        render(<EmptyCanvasGuide />);
        
        const kbdElement = screen.getByText('Space');
        expect(kbdElement.tagName).toBe('KBD');
        expect(kbdElement).toHaveClass('bg-zinc-700');
    });
});
