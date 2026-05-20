import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useNodeStore } from '../../stores/useNodeStore';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import {
    Database, Network, Calculator, Zap, MonitorPlay,
    Trash2, BarChart3, TrendingUp, Type, CheckCircle,
    AlertTriangle, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNodes, useReactFlow } from '@xyflow/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { ARITHMETIC_OPERATIONS, ArithmeticOperation } from '../../types/nodeEditor';
import { useDashboardStore } from '../../stores/useDashboardStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

const NODE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    ledgerSource:    { label: 'Ledger Source',    icon: <Database size={14} />,    color: 'text-emerald-400' },
    correlation:     { label: 'Correlation',      icon: <Network size={14} />,     color: 'text-blue-400' },
    arithmetic:      { label: 'Arithmetic',       icon: <Calculator size={14} />,  color: 'text-amber-400' },
    trigger:         { label: 'Trigger',          icon: <Zap size={14} />,         color: 'text-purple-400' },
    dashboardOutput: { label: 'Dashboard Output', icon: <MonitorPlay size={14} />, color: 'text-pink-400' },
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{label}</Label>
        {children}
    </div>
);

const ResultBadge: React.FC<{ value: number | null | undefined; error?: string; isComputing?: boolean }> = ({ value, error, isComputing }) => {
    if (error) return (
        <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1.5">
            <AlertTriangle size={12} /> {error}
        </div>
    );
    if (isComputing) return <Skeleton className="h-4 w-24" />;
    return (
        <div className="text-lg font-bold text-emerald-400 px-2 py-1">
            {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}
        </div>
    );
};

// ─── Per-type panels ─────────────────────────────────────────────────────────

const LedgerSourcePanel: React.FC<{ id: string; data: any }> = ({ id, data }) => {
    const schemas = useLedgerStore(s => s.schemas);
    const activeProfileId = useProfileStore(s => s.activeProfileId);
    const fetchSchemas = useLedgerStore(s => s.fetchSchemas);

    useEffect(() => {
        if (activeProfileId && schemas.length === 0) fetchSchemas(activeProfileId);
    }, [activeProfileId, schemas.length, fetchSchemas]);

    const handleChange = (ledgerId: string) => {
        const schema = schemas.find(s => s._id === ledgerId);
        if (!schema) return;
        const ports = schema.fields.map(f => ({
            id: `source-${f.type}-${f.name}`,
            type: f.type,
            fieldName: f.name,
        }));
        useNodeStore.getState().updateNodeData(id, { ledgerId, ledgerName: schema.name, ports });
    };

    return (
        <Row label="Ledger">
            <Select value={data.ledgerId || ''} onValueChange={handleChange}>
                <SelectTrigger className="bg-white dark:bg-zinc-900 text-xs h-8">
                    <SelectValue placeholder="Choose a ledger…" />
                </SelectTrigger>
                <SelectContent>
                    {schemas.map(s => (
                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {data.ports?.length > 0 && (
                <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Output Ports</p>
                    {data.ports.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                                p.type === 'number' ? 'bg-amber-400' :
                                p.type === 'date' ? 'bg-purple-400' :
                                p.type === 'relation' ? 'bg-emerald-400' : 'bg-blue-400'
                            }`} />
                            <span>{p.fieldName}</span>
                            <span className="ml-auto text-zinc-600">{p.type}</span>
                        </div>
                    ))}
                </div>
            )}
        </Row>
    );
};

const ArithmeticPanel: React.FC<{ id: string; data: any }> = ({ id, data }) => (
    <>
        <Row label="Operation">
            <Select
                value={data.operation || 'sum'}
                onValueChange={(v) => useNodeStore.getState().updateNodeData(id, { operation: v as ArithmeticOperation })}
            >
                <SelectTrigger className="bg-white dark:bg-zinc-900 text-xs h-8">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {ARITHMETIC_OPERATIONS.map(op => (
                        <SelectItem key={op} value={op}>{op.charAt(0).toUpperCase() + op.slice(1)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Row>
        <Row label="Result">
            <ResultBadge value={data.result} error={data.error} isComputing={data.isComputing} />
        </Row>
    </>
);

const CorrelationPanel: React.FC<{ data: any }> = ({ data }) => {
    const getLabel = (v: number | null) => {
        if (typeof v !== 'number') return '—';
        if (v >= 0.7) return 'Strong positive';
        if (v >= 0.3) return 'Moderate positive';
        if (v >= -0.3) return 'Weak / none';
        if (v >= -0.7) return 'Moderate negative';
        return 'Strong negative';
    };
    return (
        <>
            <Row label="Pearson r">
                <ResultBadge value={data.result} error={data.error} isComputing={data.isComputing} />
            </Row>
            {typeof data.result === 'number' && (
                <Row label="Interpretation">
                    <p className="text-xs text-zinc-400">{getLabel(data.result)}</p>
                </Row>
            )}
        </>
    );
};

const TriggerPanel: React.FC<{ id: string; data: any }> = ({ id, data }) => {
    const schemas = useLedgerStore(s => s.schemas);
    const activeProfileId = useProfileStore(s => s.activeProfileId);
    const fetchSchemas = useLedgerStore(s => s.fetchSchemas);

    useEffect(() => {
        if (activeProfileId && schemas.length === 0) fetchSchemas(activeProfileId);
    }, [activeProfileId, schemas.length, fetchSchemas]);

    const handleLedgerChange = (ledgerId: string) => {
        const schema = schemas.find(s => s._id === ledgerId);
        if (schema) useNodeStore.getState().updateNodeData(id, { ledgerId, ledgerName: schema.name, status: 'armed', error: undefined });
    };

    const statusColor = data.status === 'error' ? 'text-red-400' : data.status === 'fired' ? 'text-amber-400' : 'text-emerald-400';
    const StatusIcon = data.status === 'armed' ? CheckCircle : data.status === 'error' ? AlertTriangle : Zap;

    return (
        <>
            <Row label="Listen to Ledger">
                <Select value={data.ledgerId || ''} onValueChange={handleLedgerChange}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 text-xs h-8">
                        <SelectValue placeholder="Choose a ledger…" />
                    </SelectTrigger>
                    <SelectContent>
                        {schemas.map(s => (
                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Row>
            <Row label="Event">
                <div className="flex gap-2">
                    {(['on-create', 'on-edit'] as const).map(ev => (
                        <Button
                            key={ev}
                            size="xs"
                            variant={data.eventType === ev ? 'default' : 'outline'}
                            className={data.eventType === ev ? 'bg-emerald-600 border-emerald-500 text-zinc-900 dark:text-white' : 'text-zinc-400'}
                            onClick={() => useNodeStore.getState().updateNodeData(id, { eventType: ev })}
                        >
                            {ev === 'on-create' ? 'On Create' : 'On Edit'}
                        </Button>
                    ))}
                </div>
            </Row>
            <Row label="Status">
                <div className={`flex items-center gap-1.5 text-xs ${statusColor}`}>
                    <StatusIcon size={12} />
                    <span>
                        {data.status === 'fired' && data.lastFired
                            ? `Fired at ${new Date(data.lastFired).toLocaleTimeString()}`
                            : data.status === 'error'
                                ? data.error || 'Unknown error'
                                : 'Armed'}
                    </span>
                </div>
                {data.status !== 'armed' && (
                    <Button
                        size="xs"
                        variant="outline"
                        className="mt-1 text-zinc-400"
                        onClick={() => useNodeStore.getState().updateNodeData(id, { status: 'armed', error: undefined })}
                    >
                        Reset to Armed
                    </Button>
                )}
            </Row>
        </>
    );
};

const DashboardOutputPanel: React.FC<{ id: string; data: any }> = ({ id, data }) => {
    const updateWidget = useDashboardStore(s => s.updateWidget);

    const handleWidgetType = (type: 'chart' | 'trend' | 'text') => {
        useNodeStore.getState().updateNodeData(id, { widgetType: type });
        if (data.widgetId) updateWidget(data.widgetId, { type });
    };

    const handleTitle = (title: string) => {
        useNodeStore.getState().updateNodeData(id, { title });
        if (data.widgetId) updateWidget(data.widgetId, { title });
    };

    const widgetTypes = [
        { id: 'chart', icon: <BarChart3 size={14} />, color: 'bg-blue-600 border-blue-500' },
        { id: 'trend', icon: <TrendingUp size={14} />, color: 'bg-emerald-600 border-emerald-500' },
        { id: 'text',  icon: <Type size={14} />,       color: 'bg-purple-600 border-purple-500' },
    ] as const;

    return (
        <>
            <Row label="Widget Type">
                <div className="flex gap-2">
                    {widgetTypes.map(({ id: wt, icon, color }) => (
                        <Button
                            key={wt}
                            size="icon-xs"
                            variant={data.widgetType === wt ? 'default' : 'outline'}
                            className={data.widgetType === wt ? `${color} text-zinc-900 dark:text-white` : 'text-zinc-400'}
                            title={wt}
                            onClick={() => handleWidgetType(wt)}
                        >
                            {icon}
                        </Button>
                    ))}
                </div>
            </Row>
            <Row label="Widget Title">
                <Input
                    value={data.title || ''}
                    onChange={e => handleTitle(e.target.value)}
                    placeholder="Enter title…"
                    className="bg-white dark:bg-zinc-900 text-xs h-8"
                />
            </Row>
            {data.widgetId && (
                <Row label="Linked Widget">
                    <span className="text-xs font-mono text-zinc-500">{data.widgetId.slice(-12)}</span>
                </Row>
            )}
        </>
    );
};

// ─── Main Inspector ──────────────────────────────────────────────────────────

export const NodeInspector: React.FC = () => {
    const { selectedNodeId, setSelectedNodeId } = useUIStore();
    const nodes = useNodes();
    const { deleteElements } = useReactFlow();

    const node = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (node) setLabel((node.data.label as string) || '');
    }, [node?.id]);

    if (!node) {
        return (
            <div className="p-8 text-center text-zinc-500">
                <Info className="mx-auto mb-2 opacity-20" size={48} />
                <p className="text-sm">Select a node to configure it.</p>
            </div>
        );
    }

    const meta = NODE_META[node.type || ''] ?? { label: node.type, icon: null, color: 'text-zinc-400' };

    const handleLabelBlur = () => {
        useNodeStore.getState().updateNodeData(node.id, { label });
    };

    const handleDelete = () => {
        deleteElements({ nodes: [{ id: node.id }] });
        setSelectedNodeId(null);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
                <span className={meta.color}>{meta.icon}</span>
                <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{meta.label}</h2>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                    {/* Label */}
                    <Row label="Label">
                        <Input
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            onBlur={handleLabelBlur}
                            className="bg-white dark:bg-zinc-900 text-xs h-8"
                        />
                    </Row>

                    <div className="border-t border-zinc-200 dark:border-zinc-800" />

                    {/* Per-type config */}
                    {node.type === 'ledgerSource'    && <LedgerSourcePanel    id={node.id} data={node.data} />}
                    {node.type === 'arithmetic'      && <ArithmeticPanel      id={node.id} data={node.data} />}
                    {node.type === 'correlation'     && <CorrelationPanel     data={node.data} />}
                    {node.type === 'trigger'         && <TriggerPanel         id={node.id} data={node.data} />}
                    {node.type === 'dashboardOutput' && <DashboardOutputPanel id={node.id} data={node.data} />}
                </div>
            </ScrollArea>

            {/* Footer */}
            <Card className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 shrink-0">
                <Button variant="destructive" className="w-full gap-2" onClick={handleDelete}>
                    <Trash2 size={16} /> Delete Node
                </Button>
            </Card>
        </div>
    );
};
