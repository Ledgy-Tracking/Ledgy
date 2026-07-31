import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useLedgerStore } from '@/stores/useLedgerStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { ChevronDown, ChevronUp, Database, Settings, AlertTriangle, GripVertical, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLedgerData } from '../hooks/useLedgerData';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useFieldStats } from '../hooks/useLedgerSourceData';
import { portColorMap } from '../utils/portColors';
import { SchemaField } from '@/types/ledger';
import { LEDGER_CACHE_SIZE_OPTIONS, LEDGER_CACHE_SIZE_MAX } from '../utils/nodeConstants';

export interface LedgerSourceNodeData {
    type: 'ledgerSource';
    label?: string;
    ledgerId: string;
    ledgerName: string;
    schemaSnapshot: SchemaField[];
    showFieldTypes: boolean;
    showLatestValues: boolean;
    cacheSize: number;
    lastUpdated?: string;
    isStale?: boolean;
    // Hydrated data from Story 4-10
    entries?: import('@/types/ledger').LedgerEntry[];
    count?: number;
    aggregates?: {
        sum?: Record<string, number>;
        avg?: Record<string, number>;
        min?: Record<string, number>;
        max?: Record<string, number>;
    };
    isLoading?: boolean;
    error?: string;
    // Ghost reference data
    ghosts?: Array<{
        entryId: string;
        displayText: string;
        tooltip: string;
        style: string;
        originalData?: any;
    }>;
    ghostCount?: number;
    // Schema change warnings
    schemaStaleWarning?: string;
}

/**
 * Runtime type guard for LedgerSourceNodeData
 */
function isValidLedgerSourceNodeData(data: unknown): data is LedgerSourceNodeData {
    if (typeof data !== 'object' || data === null) return false;
    const d = data as Record<string, unknown>;
    return (
        d.type === 'ledgerSource' &&
        typeof d.ledgerId === 'string' &&
        typeof d.ledgerName === 'string' &&
        Array.isArray(d.schemaSnapshot) &&
        typeof d.showFieldTypes === 'boolean' &&
        typeof d.showLatestValues === 'boolean' &&
        typeof d.cacheSize === 'number'
    );
}

/**
 * Sanitize field name for use in handle ID
 * Replaces colons with underscores to prevent ID parsing issues
 */
function sanitizeFieldId(fieldId: string): string {
    return fieldId.replace(/:/g, '_');
}

// Type badge colors per UX spec
const typeBadgeColors: Record<string, { bg: string; text: string }> = {
    text: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' },
    long_text: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' },
    number: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    date: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    relation: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    boolean: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

/**
 * Ledger Source Node - represents a ledger schema as a data source
 * Story 4-5: Ledger Source Node Component with real-time data preview
 */
export const LedgerSourceNode: React.FC<NodeProps> = React.memo(({ id, data, selected }) => {
    const schemas = useLedgerStore(s => s.schemas);
    const fetchSchemas = useLedgerStore(s => s.fetchSchemas);
    const activeProfileId = useProfileStore(s => s.activeProfileId);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    // Runtime type validation with fallback
    const nodeData = isValidLedgerSourceNodeData(data) ? data : {
        type: 'ledgerSource' as const,
        label: 'Invalid Node Data',
        ledgerId: '',
        ledgerName: 'Select Ledger...',
        schemaSnapshot: [],
        showFieldTypes: true,
        showLatestValues: true,
        cacheSize: LEDGER_CACHE_SIZE_MAX,
        isStale: true,
        entries: [],
        count: 0,
        ghosts: [],
        ghostCount: 0,
        isLoading: false,
    };
    const { ledgerId, ledgerName, schemaSnapshot, showFieldTypes, showLatestValues, cacheSize, entries: hydratedEntries, ghosts, ghostCount, isLoading: hydratedLoading, error: hydratedError, schemaStaleWarning } = nodeData;

    // Track previous ledgerId to avoid unnecessary updates
    const prevLedgerIdRef = useRef<string | undefined>(undefined);
    const { updateNodeData } = useReactFlow();

    // Hydrate ledger data on mount and subscribe to live updates
    const { hydrateLedgerSourceNode } = useLedgerData();
    useLiveQuery(
        ledgerId || undefined,
        (entries) => {
            // Update node data with hydrated entries
            updateNodeData(id, { entries, count: entries.length });
        },
        cacheSize
    );

    // Get data from node data (hydrated)
    const entries = hydratedEntries || [];
    const isLoading = hydratedLoading || false;
    const error = hydratedError;

    // Hydrate ledger data when ledgerId or schema changes
    useEffect(() => {
        if (!ledgerId || schemaSnapshot.length === 0) return;

        const hydrateData = async () => {
            updateNodeData(id, { isLoading: true, error: undefined });

            try {
                const result = await hydrateLedgerSourceNode(ledgerId, schemaSnapshot);
                updateNodeData(id, {
                    entries: result.entries,
                    count: result.count,
                    aggregates: result.aggregates,
                    isLoading: false,
                    error: result.error,
                    lastUpdated: new Date().toISOString()
                });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to hydrate ledger data';
                updateNodeData(id, {
                    isLoading: false,
                    error: errorMessage
                });
            }
        };

        hydrateData();
    }, [ledgerId, schemaSnapshot, id, updateNodeData, hydrateLedgerSourceNode]);

    // Fetch schemas on mount for ledger selector
    useEffect(() => {
        if (activeProfileId && schemas.length === 0) {
            fetchSchemas(activeProfileId).catch((err: unknown) => {
                console.error('Failed to fetch schemas:', err);
                // Error state is handled by the store, but we log it here for debugging
            });
        }
    }, [activeProfileId, schemas.length, fetchSchemas]);

    // Update ports when ledgerId changes or when schemas are updated
    useEffect(() => {
        if (!ledgerId) return;
        
        const schema = schemas.find(s => s._id === ledgerId);
        if (schema) {
            // Only update if schema has actually changed to avoid infinite loops
            const currentSnapshot = JSON.stringify(schemaSnapshot);
            const newSnapshot = JSON.stringify(schema.fields);
            const nameChanged = schema.name !== ledgerName;
            
            if (prevLedgerIdRef.current !== ledgerId || currentSnapshot !== newSnapshot || nameChanged) {
                prevLedgerIdRef.current = ledgerId;
                updateNodeData(id, { 
                    type: 'ledgerSource',
                    schemaSnapshot: schema.fields, 
                    ledgerName: schema.name,
                    lastUpdated: new Date().toISOString()
                });
            }
        }
    }, [ledgerId, schemas, id, updateNodeData, schemaSnapshot, ledgerName]);

    const handleLedgerChange = useCallback((newLedgerId: string) => {
        const schema = schemas.find(s => s._id === newLedgerId);
        if (schema) {
            updateNodeData(id, {
                type: 'ledgerSource',
                ledgerId: newLedgerId,
                ledgerName: schema.name,
                schemaSnapshot: schema.fields,
                showFieldTypes: true,
                showLatestValues: true,
                cacheSize: LEDGER_CACHE_SIZE_MAX,
                // Reset hydrated data
                entries: undefined,
                count: undefined,
                aggregates: undefined,
                isLoading: false,
                error: undefined,
                lastUpdated: new Date().toISOString()
            });
            setIsConfigOpen(false);
        }
    }, [schemas, id, updateNodeData]);

    // Check if ledger was deleted
    const isLedgerDeleted = useMemo(() => {
        if (!ledgerId) return false;
        return schemas.length > 0 && !schemas.find(s => s._id === ledgerId);
    }, [ledgerId, schemas]);

    const displayFields = schemaSnapshot || [];

    return (
        <TooltipProvider>
                <div
                    className={`w-[240px] rounded-lg border shadow-lg overflow-hidden ${
                    selected ? 'ring-2 ring-emerald-500 shadow-lg' : ''
                } ${
                    isLedgerDeleted 
                        ? 'border-red-500/50 bg-red-50 dark:bg-red-950/10' 
                        : 'border-zinc-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900'
                }`}
            >
                {/* Header - Emerald for source nodes per UX spec */}
                <div
                    className="flex items-center justify-between px-3 py-2 bg-emerald-600 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <Database size={14} className="text-zinc-900 dark:text-white shrink-0" />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                            {ledgerName || 'Select Ledger...'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {isLedgerDeleted && (
                            <AlertTriangle size={14} className="text-red-400" />
                        )}
                        {/* Schema stale warning */}
                        {schemaStaleWarning && (
                            <div title={schemaStaleWarning}>
                                <AlertTriangle size={14} className="text-amber-400" />
                            </div>
                        )}
                        {/* Entry count and ghost badges */}
                        {ledgerId && !isLoading && !error && (
                            <>
                                <div className="text-xs bg-white/20 text-zinc-900 dark:text-white px-1.5 py-0.5 rounded">
                                    {nodeData.count || 0}
                                </div>
                                {(ghostCount || 0) > 0 && (
                                    <div className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <span>⚠️</span>
                                        <span>{ghostCount}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {/* Loading spinner */}
                        {isLoading && (
                            <Loader2 size={12} className="animate-spin text-white/70" />
                        )}
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsConfigOpen(!isConfigOpen);
                            }}
                            variant="ghost"
                            size="icon-xs"
                            className="text-zinc-700 dark:text-white/70 hover:text-zinc-900 dark:hover:text-white hover:bg-white/20"
                            title="Configure"
                            aria-label="Configure node"
                            aria-expanded={isConfigOpen}
                        >
                            <Settings size={14} />
                        </Button>
                        {isExpanded ? <ChevronUp size={14} className="text-zinc-700 dark:text-white/70" /> : <ChevronDown size={14} className="text-zinc-700 dark:text-white/70" />}
                    </div>
                </div>

                {/* Configuration Panel */}
                {isConfigOpen && (
                    <Card className="p-3 border-b border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800/50 rounded-none border-x-0 border-t-0 space-y-3">
                        {/* Ledger Selector */}
                        <div>
                            <Label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Select Ledger:</Label>
                            <Select
                                value={ledgerId || ''}
                                onValueChange={(value) => handleLedgerChange(value)}
                            >
                                <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 h-8 text-xs">
                                    <SelectValue placeholder="-- Choose a ledger --" />
                                </SelectTrigger>
                                <SelectContent>
                                    {schemas.map(schema => (
                                        <SelectItem key={schema._id} value={schema._id}>
                                            {schema.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Display Options */}
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-500 dark:text-zinc-400 block">Display Options:</Label>
                            
                            {/* Show Field Types Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-700 dark:text-zinc-300">Show field types</span>
                                <Button
                                    variant={showFieldTypes ? 'default' : 'outline'}
                                    size="icon-xs"
                                    onClick={() => updateNodeData(id, { showFieldTypes: !showFieldTypes })}
                                    className={`h-5 w-8 ${showFieldTypes ? 'bg-emerald-600' : ''}`}
                                    aria-label={showFieldTypes ? 'Hide field types' : 'Show field types'}
                                >
                                    <span className="text-[10px]">{showFieldTypes ? 'On' : 'Off'}</span>
                                </Button>
                            </div>

                            {/* Show Latest Values Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-700 dark:text-zinc-300">Show latest values</span>
                                <Button
                                    variant={showLatestValues ? 'default' : 'outline'}
                                    size="icon-xs"
                                    onClick={() => updateNodeData(id, { showLatestValues: !showLatestValues })}
                                    className={`h-5 w-8 ${showLatestValues ? 'bg-emerald-600' : ''}`}
                                    aria-label={showLatestValues ? 'Hide latest values' : 'Show latest values'}
                                >
                                    <span className="text-[10px]">{showLatestValues ? 'On' : 'Off'}</span>
                                </Button>
                            </div>
                        </div>

                        {/* Cache Size Selector */}
                        <div>
                            <Label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Cache Size:</Label>
                            <Select
                                value={String(cacheSize)}
                                onValueChange={(value) => updateNodeData(id, { cacheSize: parseInt(value, 10) })}
                            >
                                <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 h-8 text-xs">
                                    <SelectValue placeholder="Cache size" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LEDGER_CACHE_SIZE_OPTIONS.map(size => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size} entries
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </Card>
                )}

                {/* Loading State */}
                {isLoading && ledgerId && (
                    <div className="px-3 py-2 bg-emerald-500/10 border-b border-emerald-500/30">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs">
                            <span className="animate-pulse">Loading ledger data...</span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/30">
                        <div className="flex items-center gap-2 text-red-400 text-xs">
                            <AlertTriangle size={12} />
                            <span>Error: {error}</span>
                        </div>
                    </div>
                )}

                {/* Schema Stale Warning */}
                {schemaStaleWarning && !error && (
                    <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/30">
                        <div className="flex items-center gap-2 text-amber-400 text-xs">
                            <AlertTriangle size={12} />
                            <span>Schema changed: {schemaStaleWarning}</span>
                        </div>
                    </div>
                )}

                {/* Deleted Ledger Warning */}
                {isLedgerDeleted && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/30 cursor-help">
                                <div className="flex items-center gap-2 text-red-400 text-xs">
                                    <AlertTriangle size={12} />
                                    <span>Ledger not found</span>
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[280px] bg-zinc-800 border-zinc-700">
                            <div className="text-xs text-zinc-300">
                                <div className="font-medium text-red-400 mb-1">⚠️ Ledger Deleted</div>
                                <div>The ledger this node references has been deleted.</div>
                                <div className="text-zinc-500 mt-1">Connections are disabled. Select a different ledger or remove this node.</div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Fields */}
                {isExpanded && displayFields.length > 0 && (
                    <ScrollArea className="p-2 space-y-1 max-h-[320px]">
                        {displayFields.map((field, index) => (
                            <LedgerFieldOutput
                                key={field.name}
                                field={field}
                                nodeId={id}
                                index={index}
                                showType={showFieldTypes}
                                showLatestValue={showLatestValues}
                                entries={entries}
                                isLedgerDeleted={isLedgerDeleted}
                            />
                        ))}

                        {/* Ghost entries */}
                        {ghosts && ghosts.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-zinc-300 dark:border-zinc-600">
                                <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                                    <span>⚠️</span>
                                    <span>Ghost References ({ghosts.length})</span>
                                </div>
                                {ghosts.slice(0, 3).map((ghost, _index) => (
                                    <LedgerGhostField
                                        key={ghost.entryId}
                                        ghost={ghost}
                                        field={displayFields[0]} // Use first field for display
                                        showType={showFieldTypes}
                                    />
                                ))}
                                {ghosts.length > 3 && (
                                    <div className="text-xs text-zinc-500 mt-1 px-2">
                                        ...and {ghosts.length - 3} more ghost entries
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                )}

                {/* Empty State */}
                {isExpanded && displayFields.length === 0 && (
                    <div className="p-4 text-center">
                        <p className="text-xs text-zinc-500">
                            {ledgerId ? 'No fields in this ledger' : 'Select a ledger to see ports'}
                        </p>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
});

LedgerSourceNode.displayName = 'LedgerSourceNode';

// Field Output Component with data preview tooltip
interface LedgerFieldOutputProps {
    field: SchemaField;
    nodeId: string;
    index: number;
    showType: boolean;
    showLatestValue: boolean;
    entries: import('@/types/ledger').LedgerEntry[];
    isLedgerDeleted: boolean;
}

const LedgerFieldOutput: React.FC<LedgerFieldOutputProps> = React.memo(({
    field,
    nodeId,
    showType,
    showLatestValue,
    entries,
    isLedgerDeleted,
}) => {
    // Use field.id (immutable UUID) for handle ID to prevent connection breakage on rename
    // Sanitize to handle any edge cases with special characters
    const fieldId = field.id ? sanitizeFieldId(field.id) : sanitizeFieldId(field.name);
    const handleId = `${nodeId}:${fieldId}`;
    const typeColor = typeBadgeColors[field.type] || typeBadgeColors.text;

    // Get latest value for preview
    const latestEntry = entries[0];
    const latestValue = latestEntry?.data[field.name];

    // Get stats for number fields
    const stats = useFieldStats(entries, field.name);

    // Format preview text
    const previewText = useMemo(() => {
        if (!showLatestValue || entries.length === 0) return null;

        switch (field.type) {
            case 'text':
            case 'long_text':
                const text = String(latestValue || '');
                return `Latest: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`;

            case 'number':
                if (stats) {
                    return `Latest: ${latestValue} (Avg: ${stats.avg?.toFixed(1)}, Min: ${stats.min}, Max: ${stats.max})`;
                }
                return `Latest: ${latestValue}`;

            case 'date':
                if (latestValue && typeof latestValue === 'string') {
                    const date = new Date(latestValue);
                    // Validate date is not Invalid Date
                    if (!isNaN(date.getTime())) {
                        const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
                        return `Latest: ${date.toLocaleDateString()} (${daysAgo} days ago)`;
                    }
                    return 'Latest: Invalid date';
                }
                return 'Latest: No date';

            case 'relation':
                return `Latest: ${latestValue || 'No relation'}`;

            default:
                return `Latest: ${latestValue || 'Empty'}`;
        }
    }, [field.type, latestValue, stats, entries.length, showLatestValue]);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className={`relative flex items-center justify-between px-2 py-1.5 rounded transition-colors group ${
                        isLedgerDeleted
                            ? 'bg-gray-200/50 dark:bg-zinc-800/30 cursor-not-allowed'
                            : 'bg-gray-200/50 dark:bg-zinc-800/30 hover:bg-gray-200 dark:hover:bg-zinc-800/50 cursor-pointer'
                    }`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Drag affordance icon */}
                        <GripVertical size={12} className="text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{field.name}</span>
                        {showType && (
                            <span
                                className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${typeColor.bg} ${typeColor.text}`}
                            >
                                {field.type}
                            </span>
                        )}
                    </div>

                    {/* Output Handle */}
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={handleId}
                        className="!w-3 !h-3 !border-2 !border-zinc-900 transition-colors hover:!bg-emerald-400"
                        style={{
                            right: '-6px',
                            backgroundColor: portColorMap[field.type as keyof typeof portColorMap] || portColorMap.text,
                            cursor: isLedgerDeleted ? 'not-allowed' : 'crosshair'
                        }}
                        aria-label={`${field.name} output handle, ${field.type} type`}
                        aria-disabled={isLedgerDeleted}
                    />
                </div>
            </TooltipTrigger>

            {/* Data Preview Tooltip */}
            {showLatestValue && previewText && !isLedgerDeleted && (
                <TooltipContent side="left" className="max-w-[280px] bg-zinc-800 border-zinc-700">
                    <div className="text-xs text-zinc-300">
                        <div className="font-medium text-zinc-100 mb-1">{field.name} ({field.type})</div>
                        <div>{previewText}</div>
                        <div className="text-zinc-500 mt-1 text-[10px]">Drag to connect to another node</div>
                    </div>
                </TooltipContent>
            )}
        </Tooltip>
    );
});

LedgerFieldOutput.displayName = 'LedgerFieldOutput';

/**
 * Ghost field display component
 */
interface LedgerGhostFieldProps {
    ghost: {
        entryId: string;
        displayText: string;
        tooltip: string;
        style: string;
        originalData?: any;
    };
    field: SchemaField;
    showType: boolean;
}

const LedgerGhostField: React.FC<LedgerGhostFieldProps> = React.memo(({
    ghost,
    field,
    showType
}) => {
    const typeColor = typeBadgeColors[field.type] || typeBadgeColors.text;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="relative flex items-center justify-between px-2 py-1.5 rounded bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-red-600 dark:text-red-400 line-through truncate">
                            {field.name}
                        </span>
                        {showType && (
                            <span
                                className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${typeColor.bg} ${typeColor.text}`}
                            >
                                {field.type}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-red-500">⚠️</span>
                    </div>
                </div>
            </TooltipTrigger>

            <TooltipContent side="left" className="max-w-[280px] bg-zinc-800 border-zinc-700">
                <div className="text-xs text-zinc-300">
                    <div className="font-medium text-red-400 mb-1">Ghost Entry: {ghost.entryId}</div>
                    <div>{ghost.tooltip}</div>
                    {ghost.originalData && (
                        <div className="text-zinc-500 mt-1">
                            Last value: {JSON.stringify(ghost.originalData[field.name] || 'empty')}
                        </div>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
});

LedgerGhostField.displayName = 'LedgerGhostField';
