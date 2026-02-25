import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUIStore } from '../../stores/useUIStore';
import { PanelRightOpen } from 'lucide-react';
import { EmptyDashboard } from './EmptyDashboard';
import { SchemaBuilder } from '../ledger/SchemaBuilder';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { LedgerTable } from '../ledger/LedgerTable';
import { ExportTemplateButton } from '../templates/ExportTemplateButton';
import { DashboardView } from './DashboardView';
import { Table, LayoutGrid } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const { profileId, projectId } = useParams<{ profileId: string, projectId: string }>();
    const { toggleRightInspector, rightInspectorOpen, schemaBuilderOpen, setSchemaBuilderOpen } = useUIStore();
    const { schemas, fetchSchemas } = useLedgerStore();
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Scoped schemas for this project
    const projectSchemas = schemas.filter(s => s.projectId === projectId);
    const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

    useEffect(() => {
        if (profileId) {
            fetchSchemas(profileId);
        }
    }, [profileId, fetchSchemas]);

    // Ledger detection: Use schema count for this specific project
    const hasLedgers = projectSchemas.length > 0;

    const handleSelectLedger = (schemaId: string) => {
        setSelectedLedgerId(schemaId);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-50 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 shrink-0">
                <div className="flex-1 flex items-baseline gap-2">
                    <h1 className="text-sm font-semibold italic tracking-tighter text-emerald-500 mr-2">LEDGY</h1>
                    
                    <div className="flex bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-zinc-700 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title="Table View"
                        >
                            <Table size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-700 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title="Metric Grid"
                        >
                            <LayoutGrid size={14} />
                        </button>
                    </div>

                    {viewMode === 'table' && hasLedgers && (
                        <select
                            value={selectedLedgerId || ''}
                            onChange={(e) => handleSelectLedger(e.target.value)}
                            className="ml-4 bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            aria-label="Select ledger"
                        >
                            <option value="">Select a ledger...</option>
                            {projectSchemas.map(schema => (
                                <option key={schema._id} value={schema._id}>
                                    {schema.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {hasLedgers && <ExportTemplateButton />}

                    {!rightInspectorOpen && (
                        <button
                            onClick={toggleRightInspector}
                            className="ml-2 text-zinc-400 hover:text-zinc-200"
                            title="Open Inspector"
                            aria-label="Open inspector panel"
                        >
                            <PanelRightOpen size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Table Area / Main Content */}
            <div className="flex-1 overflow-hidden">
                {!hasLedgers && viewMode === 'table' ? (
                    <div className="h-full flex items-center justify-center">
                        <EmptyDashboard onActionClick={() => setSchemaBuilderOpen(true)} />
                    </div>
                ) : viewMode === 'grid' ? (
                    <DashboardView dashboardId={projectId || 'default'} />
                ) : selectedLedgerId ? (
                    <LedgerTable schemaId={selectedLedgerId} />
                ) : (
                    <div className="h-full flex items-center justify-center text-zinc-500">
                        <p>Select a ledger to view entries</p>
                    </div>
                )}
            </div>

            {schemaBuilderOpen && profileId && projectId && (
                <SchemaBuilder
                    projectId={projectId}
                    onClose={() => setSchemaBuilderOpen(false)}
                />
            )}
        </div>
    );
};
