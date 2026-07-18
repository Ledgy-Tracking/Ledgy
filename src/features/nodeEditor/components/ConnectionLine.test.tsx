/**
 * Unit tests for ConnectionLine component
 * Story 4-7: Complex Edge Connection Snapping (AC2, AC3)
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConnectionLine, ConnectionLineWithStatus } from './ConnectionLine';
import { ConnectionLineComponentProps, Position, ConnectionLineType } from '@xyflow/react';

// Mock props for testing
const createMockProps = (
    overrides: Partial<ConnectionLineComponentProps & { connectionStatus?: 'valid' | 'invalid' | 'default' }> = {}
): ConnectionLineComponentProps & { connectionStatus?: 'valid' | 'invalid' | 'default' } => ({
    fromX: 100,
    fromY: 100,
    toX: 300,
    toY: 200,
    fromPosition: Position.Right,
    toPosition: Position.Left,
    connectionLineType: ConnectionLineType.Bezier,
    connectionStatus: 'default',
    ...overrides
});

describe('ConnectionLine', () => {
    it('should render without crashing', () => {
        const props = createMockProps();
        const { container } = render(<ConnectionLine {...props} />);
        
        expect(container.querySelector('g[data-testid="connection-line"]')).toBeInTheDocument();
    });

    it('should render with default status', () => {
        const props = createMockProps({ connectionStatus: 'default' });
        const { container } = render(<ConnectionLine {...props} />);
        
        const line = container.querySelector('g[data-testid="connection-line"]');
        expect(line).toHaveAttribute('data-connection-status', 'default');
    });

    it('should render with valid status', () => {
        const props = createMockProps({ connectionStatus: 'valid' });
        const { container } = render(<ConnectionLine {...props} />);
        
        const line = container.querySelector('g[data-testid="connection-line"]');
        expect(line).toHaveAttribute('data-connection-status', 'valid');
    });

    it('should render with invalid status', () => {
        const props = createMockProps({ connectionStatus: 'invalid' });
        const { container } = render(<ConnectionLine {...props} />);
        
        const line = container.querySelector('g[data-testid="connection-line"]');
        expect(line).toHaveAttribute('data-connection-status', 'invalid');
    });

    it('should render SVG path element', () => {
        const props = createMockProps();
        const { container } = render(<ConnectionLine {...props} />);
        
        const path = container.querySelector('path[data-testid="connection-line-path"]');
        expect(path).toBeInTheDocument();
    });

    it('should render source indicator circle', () => {
        const props = createMockProps();
        const { container } = render(<ConnectionLine {...props} />);
        
        const indicator = container.querySelector('.connection-line-source-indicator');
        expect(indicator).toBeInTheDocument();
    });

    it('should render target indicator circle', () => {
        const props = createMockProps();
        const { container } = render(<ConnectionLine {...props} />);
        
        const indicator = container.querySelector('.connection-line-target-indicator');
        expect(indicator).toBeInTheDocument();
    });

    it('should render glow effect for valid connections', () => {
        const props = createMockProps({ connectionStatus: 'valid' });
        const { container } = render(<ConnectionLine {...props} />);
        
        const glow = container.querySelector('.connection-line-glow');
        expect(glow).toBeInTheDocument();
    });

    it('should not render glow effect for non-valid connections', () => {
        const props = createMockProps({ connectionStatus: 'default' });
        const { container } = render(<ConnectionLine {...props} />);
        
        const glow = container.querySelector('.connection-line-glow');
        expect(glow).not.toBeInTheDocument();
    });

    it('should not render glow effect for invalid connections', () => {
        const props = createMockProps({ connectionStatus: 'invalid' });
        const { container } = render(<ConnectionLine {...props} />);
        
        const glow = container.querySelector('.connection-line-glow');
        expect(glow).not.toBeInTheDocument();
    });

    it('should apply correct stroke color for default status', () => {
        const props = createMockProps({ connectionStatus: 'default' });
        const { container } = render(<ConnectionLine {...props} />);
        
        const path = container.querySelector('.connection-line-default');
        expect(path).toBeInTheDocument();
    });

    it('should apply correct stroke color for valid status', () => {
        const props = createMockProps({ connectionStatus: 'valid' });
        const { container } = render(<ConnectionLine {...props} />);
        
        const path = container.querySelector('.connection-line-valid');
        expect(path).toBeInTheDocument();
    });

    it('should apply correct stroke color for invalid status', () => {
        const props = createMockProps({ connectionStatus: 'invalid' });
        const { container } = render(<ConnectionLine {...props} />);
        
        const path = container.querySelector('.connection-line-invalid');
        expect(path).toBeInTheDocument();
    });
});

describe('ConnectionLineWithStatus', () => {
    it('should render ConnectionLine component', () => {
        const props = createMockProps();
        const { container } = render(<ConnectionLineWithStatus {...props} />);
        
        expect(container.querySelector('g[data-testid="connection-line"]')).toBeInTheDocument();
    });

    it('should render status tooltip when message provided', () => {
        const props = createMockProps({ connectionStatus: 'valid' });
        const { container } = render(
            <ConnectionLineWithStatus {...props} statusMessage="Valid Connection" />
        );
        
        const tooltip = container.querySelector('.connection-status-tooltip');
        expect(tooltip).toBeInTheDocument();
    });

    it('should not render status tooltip when no message', () => {
        const props = createMockProps();
        const { container } = render(<ConnectionLineWithStatus {...props} />);
        
        const tooltip = container.querySelector('.connection-status-tooltip');
        expect(tooltip).not.toBeInTheDocument();
    });

    it('should apply valid styling to tooltip', () => {
        const props = createMockProps({ connectionStatus: 'valid' });
        const { container } = render(
            <ConnectionLineWithStatus {...props} statusMessage="Valid" />
        );
        
        const tooltip = container.querySelector('.bg-emerald-100');
        expect(tooltip).toBeInTheDocument();
    });

    it('should apply invalid styling to tooltip', () => {
        const props = createMockProps({ connectionStatus: 'invalid' });
        const { container } = render(
            <ConnectionLineWithStatus {...props} statusMessage="Invalid" />
        );
        
        const tooltip = container.querySelector('.bg-red-100');
        expect(tooltip).toBeInTheDocument();
    });
});
