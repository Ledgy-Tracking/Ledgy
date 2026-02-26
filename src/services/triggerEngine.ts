/**
 * Trigger Execution Engine
 * Story 4-4: Autonomous Triggers
 * 
 * Handles trigger detection and execution with loop prevention
 */

import { CanvasNode, CanvasEdge } from '../types/nodeEditor';

export interface TriggerExecutionContext {
    triggerId: string;
    entryId: string;
    ledgerId: string;
    eventType: 'on-create' | 'on-edit';
    depth: number;
    data?: any;
}

export const MAX_EXECUTION_DEPTH = 10;

/**
 * Execute trigger downstream nodes
 * Processes connected nodes in sequence
 */
export async function executeTrigger(
    context: TriggerExecutionContext,
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    triggerNodeId: string
): Promise<void> {
    if (context.depth >= MAX_EXECUTION_DEPTH) {
        throw new Error('Infinite loop detected: Maximum execution depth exceeded');
    }

    // Find all edges connected to this trigger
    const outgoingEdges = edges.filter(e => e.source === triggerNodeId);

    // Process each connected node
    for (const edge of outgoingEdges) {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!targetNode) continue;

        // Execute based on node type
        await executeNode(targetNode, context, nodes, edges);
    }
}

/**
 * Execute a single node in the trigger chain
 */
async function executeNode(
    node: CanvasNode,
    context: TriggerExecutionContext,
    allNodes: CanvasNode[],
    allEdges: CanvasEdge[]
): Promise<void> {
    const newContext: TriggerExecutionContext = {
        ...context,
        depth: context.depth + 1,
    };

    switch (node.type) {
        case 'correlation':
        case 'arithmetic':
            // Compute nodes process data and pass to next nodes
            await executeComputeNode(node, newContext, allNodes, allEdges);
            break;

        case 'ledgerSource':
            // Ledger source provides data
            await executeLedgerSource(node, newContext, allNodes, allEdges);
            break;

        case 'trigger':
            // Another trigger - check for loop
            // This would be caught by depth check
            await executeTrigger(newContext, allNodes, allEdges, node.id);
            break;

        default:
            console.warn(`Unknown node type: ${node.type}`);
    }
}

/**
 * Execute compute node (correlation/arithmetic)
 */
async function executeComputeNode(
    node: CanvasNode,
    context: TriggerExecutionContext,
    allNodes: CanvasNode[],
    allEdges: CanvasEdge[]
): Promise<void> {
    // In production, this would:
    // 1. Fetch input data from connected ledger sources
    // 2. Run computation via computationService
    // 3. Pass result to downstream nodes

    // For now, just continue the chain
    const outgoingEdges = allEdges.filter(e => e.source === node.id);
    for (const edge of outgoingEdges) {
        const targetNode = allNodes.find(n => n.id === edge.target);
        if (targetNode) {
            await executeNode(targetNode, context, allNodes, allEdges);
        }
    }
}

/**
 * Execute ledger source node
 */
async function executeLedgerSource(
    node: CanvasNode,
    context: TriggerExecutionContext,
    allNodes: CanvasNode[],
    allEdges: CanvasEdge[]
): Promise<void> {
    // Pass data to connected nodes
    const outgoingEdges = allEdges.filter(e => e.source === node.id);
    for (const edge of outgoingEdges) {
        const targetNode = allNodes.find(n => n.id === edge.target);
        if (targetNode) {
            await executeNode(targetNode, context, allNodes, allEdges);
        }
    }
}

/**
 * Check if a trigger would create an infinite loop
 */
export function wouldCreateLoop(
    triggerLedgerId: string,
    _triggerEventType: string,
    actionCreatesEntry: boolean,
    actionLedgerId: string
): boolean {
    // Simple loop detection: if action creates entry in same ledger that triggered it
    return actionCreatesEntry && triggerLedgerId === actionLedgerId;
}
