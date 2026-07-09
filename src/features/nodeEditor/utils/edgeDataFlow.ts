import { useNodeStore } from '../../../stores/useNodeStore';
import { CanvasNode, CanvasEdge } from '../../../types/nodeEditor';

/**
 * Get the current output data from a source node
 * Handles different node types and their output formats
 */
export function getSourceNodeOutput(nodeId: string): any {
    const state = useNodeStore.getState();
    const node = state.nodes.find(n => n.id === nodeId);

    if (!node) {
        console.warn(`Node ${nodeId} not found for output retrieval`);
        return null;
    }

    // Handle different node types
    switch (node.type) {
        case 'ledgerSource': {
            // Ledger Source outputs the hydrated entries
            const data = node.data as any;
            return data.entries || [];
        }

        case 'correlation': {
            // Correlation node outputs computed correlation coefficient
            const data = node.data as any;
            return data.output;
        }

        case 'arithmetic': {
            // Arithmetic node outputs computed result
            const data = node.data as any;
            return data.output;
        }

        default:
            console.warn(`Unknown node type ${node.type} for output retrieval`);
            return null;
    }
}

/**
 * Update the input data of a target node
 * Handles different node types and their input formats
 */
export function updateTargetNodeInput(
    nodeId: string,
    inputKey: string,
    inputData: any
): void {
    const state = useNodeStore.getState();
    const node = state.nodes.find(n => n.id === nodeId);

    if (!node) {
        console.warn(`Node ${nodeId} not found for input update`);
        return;
    }

    // Handle data type conversion based on target node type
    let processedData = inputData;

    switch (node.type) {
        case 'correlation': {
            // Correlation node expects arrays for inputA and inputB
            if (Array.isArray(inputData)) {
                // If input is array, use it directly
                processedData = inputData;
            } else if (typeof inputData === 'number') {
                // If input is single number, convert to array with that number
                processedData = [inputData];
            } else {
                console.warn(`Invalid input data type for correlation node: ${typeof inputData}`);
                return;
            }

            // Update the appropriate input field
            const updates: Record<string, any> = {};
            if (inputKey === 'inputA' || inputKey === 'input') {
                // Default to inputA if 'input' is specified
                updates.inputA = processedData;
            } else if (inputKey === 'inputB') {
                updates.inputB = processedData;
            } else {
                console.warn(`Unknown input key for correlation node: ${inputKey}`);
                return;
            }

            state.updateNodeData(nodeId, updates);
            break;
        }

        case 'arithmetic': {
            // Arithmetic node expects array of numbers for inputs
            if (Array.isArray(inputData)) {
                // If input is array, use it directly
                processedData = inputData;
            } else if (typeof inputData === 'number') {
                // If input is single number, convert to array
                processedData = [inputData];
            } else {
                console.warn(`Invalid input data type for arithmetic node: ${typeof inputData}`);
                return;
            }

            // Update the appropriate input field
            const updates: Record<string, any> = {};
            if (inputKey.startsWith('input')) {
                updates.inputs = processedData; // Arithmetic node uses 'inputs' array
            } else {
                console.warn(`Unknown input key for arithmetic node: ${inputKey}`);
                return;
            }

            state.updateNodeData(nodeId, updates);
            break;
        }

        default:
            console.warn(`Unknown node type ${node.type} for input update`);
            return;
    }
}

/**
 * Propagate output data from a source node to all connected target nodes
 * This is called whenever a node's output data changes
 */
export function propagateNodeOutput(nodeId: string, outputData?: any): void {
    const state = useNodeStore.getState();
    const edges = state.edges;

    // Find all outgoing edges from this node
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);

    if (outgoingEdges.length === 0) {
        return; // No connections, nothing to propagate
    }

    // Get output data if not provided
    const dataToPropagate = outputData !== undefined ? outputData : getSourceNodeOutput(nodeId);

    if (dataToPropagate === null || dataToPropagate === undefined) {
        console.warn(`No output data available from node ${nodeId}`);
        return;
    }

    // Propagate to each connected target
    outgoingEdges.forEach(edge => {
        const targetNodeId = edge.target;
        const inputKey = edge.targetHandle || 'input'; // Default to 'input' if no handle specified

        updateTargetNodeInput(targetNodeId, inputKey, dataToPropagate);
    });
}

/**
 * Subscribe to node data changes and trigger edge data flow propagation
 * This should be called once in the application to set up the data flow system
 */
export function setupNodeDataChangeSubscription(): () => void {
    // Use Zustand's subscribe with selector to detect node data changes
    const unsubscribe = useNodeStore.subscribe(
        (state) => state.nodes, // Select only nodes array
        (currentNodes, previousNodes) => {
            // Index previous nodes for O(1) lookup
            const previousNodesMap = new Map();
            for (let i = 0; i < previousNodes.length; i++) {
                previousNodesMap.set(previousNodes[i].id, previousNodes[i]);
            }

            // Find nodes whose data has changed
            const changedNodes = currentNodes.filter(currentNode => {
                const previousNode = previousNodesMap.get(currentNode.id);
                if (!previousNode) return false; // New node, not a change

                // Fast identity check before expensive serialization
                if (currentNode.data === previousNode.data) return false;

                // Compare data objects (shallow comparison)
                return JSON.stringify(currentNode.data) !== JSON.stringify(previousNode.data);
            });

            // Propagate changes for each modified node
            changedNodes.forEach(node => {
                // Only propagate if this node has output connections
                const state = useNodeStore.getState();
                const hasOutgoingEdges = state.edges.some(edge => edge.source === node.id);

                if (hasOutgoingEdges) {
                    propagateNodeOutput(node.id);
                }
            });
        },
        { equalityFn: (a, b) => a === b } // Reference equality for nodes array
    );

    return unsubscribe;
}