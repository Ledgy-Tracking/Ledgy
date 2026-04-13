/**
 * Custom Connection Line Component
 * Story 4-7: Complex Edge Connection Snapping (AC2, AC3)
 * 
 * Implements:
 * - Custom connection line during edge drag
 * - Bezier curves for smooth connections
 * - Visual feedback (emerald for valid, red for invalid)
 * - Glow effects and animations
 * - Connection status indicator
 */

import React, { useMemo } from 'react';
import type { ConnectionLineComponentProps } from '@xyflow/react';
import { getConnectionPath } from '../utils/bezierPath';

/**
 * Connection line visual states (AC2)
 */
type ConnectionStatus = 'valid' | 'invalid' | 'default' | 'snapped';

/**
 * Extended props including connection status and direction
 */
interface ExtendedConnectionLineProps extends ConnectionLineComponentProps {
    connectionStatus?: ConnectionStatus;
    sourceDirection?: 'left' | 'right' | 'top' | 'bottom';
}

/**
 * Style configuration for different connection states
 */
const getConnectionStyles = (status: ConnectionStatus) => {
    switch (status) {
        case 'snapped':
            return {
                stroke: '#10b981', // emerald-500
                strokeWidth: 3,
                filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.7))',
                strokeDasharray: undefined,
                className: 'connection-line-snapped'
            };
        case 'valid':
            return {
                stroke: '#10b981', // emerald-500
                strokeWidth: 3,
                filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))',
                strokeDasharray: undefined,
                className: 'connection-line-valid'
            };
        case 'invalid':
            return {
                stroke: '#ef4444', // red-500
                strokeWidth: 2,
                filter: undefined,
                strokeDasharray: '5,5',
                className: 'connection-line-invalid'
            };
        default:
            return {
                stroke: '#a1a1aa', // zinc-400
                strokeWidth: 2,
                filter: undefined,
                strokeDasharray: undefined,
                className: 'connection-line-default'
            };
    }
};

/**
 * Custom Connection Line Component
 * 
 * Renders during edge drag operations to show the potential connection.
 * Uses cubic Bezier curves for smooth, professional appearance.
 */
export const ConnectionLine: React.FC<ExtendedConnectionLineProps> = ({
    fromX,
    fromY,
    toX,
    toY,
    _connectionLineType,
    connectionStatus = 'default',
    _fromNode,
    _fromHandle,
    sourceDirection = 'right'
}) => {
    // Calculate Bezier path using actual handle direction
    const path = useMemo(() => {
        return getConnectionPath(
            { x: fromX, y: fromY },
            { x: toX, y: toY },
            sourceDirection
        );
    }, [fromX, fromY, toX, toY, sourceDirection]);

    // Get styles based on connection status
    const styles = useMemo(() => getConnectionStyles(connectionStatus), [connectionStatus]);

    // Determine if we should show the glow animation for valid/snapped connections
    const showGlow = connectionStatus === 'valid' || connectionStatus === 'snapped';

    // ARIA live region for screen reader announcements
    const ariaLabel = useMemo(() => {
        switch (connectionStatus) {
            case 'snapped':
                return 'Connection snapped to handle';
            case 'valid':
                return 'Valid connection target';
            case 'invalid':
                return 'Invalid connection target - incompatible types';
            default:
                return 'Drawing connection line';
        }
    }, [connectionStatus]);

    return (
        <g 
            data-testid="connection-line" 
            data-connection-status={connectionStatus}
            className="react-flow__connection-line"
            role="img"
            aria-label={ariaLabel}
        >
            {/* Main connection path */}
            <path
                d={path}
                fill="none"
                stroke={styles.stroke}
                strokeWidth={styles.strokeWidth}
                strokeDasharray={styles.strokeDasharray}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ 
                    filter: styles.filter,
                    transition: 'stroke 150ms ease, stroke-width 150ms ease'
                }}
                data-testid="connection-line-path"
                className={styles.className}
            />
            
            {/* Animated glow overlay for valid connections */}
            {showGlow && (
                <path
                    d={path}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="connection-line-glow"
                />
            )}

            {/* ARIA live region for status announcements */}
            <foreignObject width={0} height={0}>
                <div 
                    role="status" 
                    aria-live="polite" 
                    aria-atomic="true"
                    className="sr-only"
                >
                    {ariaLabel}
                </div>
            </foreignObject>

            {/* Source handle indicator */}
            <circle
                cx={fromX}
                cy={fromY}
                r={4}
                fill={styles.stroke}
                className="connection-line-source-indicator"
            />

            {/* Target indicator (small circle at cursor) */}
            <circle
                cx={toX}
                cy={toY}
                r={3}
                fill={styles.stroke}
                opacity={0.7}
                className="connection-line-target-indicator"
            />
        </g>
    );
};

/**
 * Connection line with status overlay
 * Shows additional feedback like "Valid Connection" or "Incompatible Types"
 */
export const ConnectionLineWithStatus: React.FC<ExtendedConnectionLineProps & {
    statusMessage?: string;
}> = (props) => {
    const { statusMessage, toX, toY, connectionStatus } = props;

    return (
        <>
            <ConnectionLine {...props} />
            
            {/* Status message tooltip */}
            {statusMessage && (
                <foreignObject
                    x={toX + 10}
                    y={toY - 30}
                    width={200}
                    height={40}
                    className="connection-status-tooltip"
                >
                    <div
                        className={`
                            inline-block px-2 py-1 rounded text-xs font-medium
                            ${connectionStatus === 'valid' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : connectionStatus === 'invalid'
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : 'bg-zinc-100 text-zinc-800 border border-zinc-300'
                            }
                        `}
                        style={{
                            backdropFilter: 'blur(4px)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        {statusMessage}
                    </div>
                </foreignObject>
            )}
        </>
    );
};

export default ConnectionLine;
