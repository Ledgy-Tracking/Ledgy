import { useNodeStore } from '../stores/useNodeStore';
import { useLedgerStore } from '../stores/useLedgerStore';
import { useDashboardStore } from '../stores/useDashboardStore';
import { computationService } from './computationService';

/**
 * Node Engine
 * Handles the execution and data flow of the node graph.
 * GAP-8: Node Engine logic
 */
class NodeEngine {
    private isComputing = false;

    /**
     * Trigger a computation pass for the current project
     */
    async executeProjectGraph() {
        if (this.isComputing) return;
        this.isComputing = true;

        try {
            const { nodes, edges } = useNodeStore.getState();
            const { entries } = useLedgerStore.getState();

            // 1. Identify valid execution order
            const executionOrder = this.getExecutionOrder(nodes as any[], edges as any[]);
            const nodeResults = new Map<string, any>();

            // 2. Execute process in order
            for (const nodeId of executionOrder) {
                const node = nodes.find(n => n.id === nodeId);
                if (!node) continue;

                if (node.type === 'ledgerSource') {
                    const nodeData = node.data as any;
                    const ledgerId = nodeData.ledgerId;
                    if (!ledgerId) continue;

                    const ledgerEntries = entries[ledgerId] || [];
                    const ports = (nodeData.ports || []) as any[];
                    const outputs: Record<string, number[]> = {};

                    ports.forEach(port => {
                        if (port.type === 'number') {
                            outputs[port.id] = ledgerEntries
                                .map(e => Number(e.data[port.fieldName]))
                                .filter(v => !isNaN(v));
                        }
                    });

                    nodeResults.set(node.id, outputs);
                } else if (node.type === 'arithmetic' || node.type === 'correlation') {
                    const targetEdges = edges.filter(e => e.target === node.id);
                    const nodeData = node.data as any;

                    if (node.type === 'arithmetic') {
                        const inputValues: number[] = [];
                        targetEdges.forEach(edge => {
                            const sourceData = nodeResults.get(edge.source);
                            const val = sourceData?.[edge.sourceHandle!];
                            if (Array.isArray(val)) {
                                inputValues.push(...val);
                            } else if (typeof val === 'number') {
                                inputValues.push(val);
                            }
                        });

                        const response = await computationService.computeArithmetic(
                            inputValues,
                            nodeData.operation || 'sum'
                        );
                        this.updateNodeData(node.id, response);
                        nodeResults.set(node.id, { output: response.result });
                    } else if (node.type === 'correlation') {
                        const xEdge = targetEdges.find(e => e.targetHandle === 'target-number-x');
                        const yEdge = targetEdges.find(e => e.targetHandle === 'target-number-y');

                        const xData = xEdge ? nodeResults.get(xEdge.source)?.[xEdge.sourceHandle!] : [];
                        const yData = yEdge ? nodeResults.get(yEdge.source)?.[yEdge.sourceHandle!] : [];

                        if (Array.isArray(xData) && Array.isArray(yData)) {
                            const response = await computationService.computeCorrelation(xData, yData);
                            this.updateNodeData(node.id, response);
                            nodeResults.set(node.id, { output: response.result });
                        }
                    }
                } else if (node.type === 'dashboardOutput') {
                    const targetEdge = edges.find(e => e.target === node.id);
                    const nodeData = node.data as any;
                    const sourceData = targetEdge ? nodeResults.get(targetEdge.source) : null;
                    const value = sourceData?.output ?? 0;

                    // Ensure widget exists and is updated
                    this.syncDashboardWidget(node.id, nodeData, value);
                }
            }
        } catch (error) {
            console.error('Node Engine Execution failed:', error);
        } finally {
            this.isComputing = false;
        }
    }

    /**
     * Update node data in store
     */
    private updateNodeData(nodeId: string, result: any) {
        const { updateNodeData } = useNodeStore.getState();
        updateNodeData(nodeId, {
            result: result.result,
            error: result.error,
            chartData: result.chartData,
            trend: result.trend,
            changePercent: result.changePercent,
            isComputing: false
        });
    }

    /**
     * Ensure dashboard widget reflects node output
     */
    private syncDashboardWidget(nodeId: string, nodeData: any, value: any) {
        const dashboardStore = useDashboardStore.getState();
        let widgetId = nodeData.widgetId;

        // Force create widget if missing (Replacement for passive node logic)
        if (!widgetId) {
            widgetId = `widget-${nodeId}`;
            useNodeStore.getState().updateNodeData(nodeId, { widgetId });
        }

        const existingWidget = dashboardStore.widgets.find(w => w.id === widgetId);
        if (!existingWidget) {
            dashboardStore.addWidget({
                id: widgetId,
                nodeId: nodeId,
                type: nodeData.widgetType || 'text',
                title: nodeData.title || 'Live Node Output',
                position: { x: 0, y: 0, w: 2, h: 2 },
                data: { value }
            });
        } else {
            dashboardStore.updateWidget(widgetId, {
                data: {
                    ...existingWidget.data,
                    value: typeof value === 'number' ? value : 0,
                    history: nodeData.chartData
                }
            });
        }
    }

    /**
     * Basic topological sort (Kahn's algorithm)
     */
    private getExecutionOrder(nodes: any[], edges: any[]): string[] {
        const inDegree = new Map<string, number>();
        const adj = new Map<string, string[]>();

        nodes.forEach(n => inDegree.set(n.id, 0));
        edges.forEach(e => {
            if (!adj.has(e.source)) adj.set(e.source, []);
            adj.get(e.source)!.push(e.target);
            inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
        });

        const queue: string[] = [];
        inDegree.forEach((degree, id) => {
            if (degree === 0) queue.push(id);
        });

        const sorted: string[] = [];
        while (queue.length > 0) {
            const u = queue.shift()!;
            sorted.push(u);

            const neighbors = adj.get(u) || [];
            neighbors.forEach(v => {
                const degree = inDegree.get(v)! - 1;
                inDegree.set(v, degree);
                if (degree === 0) queue.push(v);
            });
        }

        return sorted;
    }
}

export const nodeEngine = new NodeEngine();
