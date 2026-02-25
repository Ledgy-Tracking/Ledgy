import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUIStore } from '../../stores/useUIStore';
import { PanelRightOpen } from 'lucide-react';
import { EmptyDashboard } from './EmptyDashboard';
import { SchemaBuilder } from '../ledger/SchemaBuilder';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { LedgerTable } from '../ledger/LedgerTable';
import { ExportTemplateButton } from '../templates/ExportTemplateButton';

export const Dashboard: React.FC = () => {
    const { profileId, projectId } = useParams<{ profileId: string, projectId: string }>();
    const { toggleRightInspector, rightInspectorOpen, schemaBuilderOpen, setSchemaBuilderOpen } = useUIStore();
    const { schemas, fetchSchemas } = useLedgerStore();

    // Scoped schemas for this project
    const projectSchemas = schemas.filter(s => s.projectId === projectId);
    const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

    useEffect(() => {
        if (profileId) {
            fetchSchemas(profileId);
        }
    }, [profileId, fetchSchemas]);

    // Ledger detection: Use schema count as proxy for ledgers
    const hasLedgers = schemas.length > 0;

    const handleSelectLedger = (schemaId: string) => {
        setSelectedLedgerId(schemaId);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-50 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 shrink-0">
                <div className="flex-1 flex items-baseline gap-2">
                    <h1 className="text-sm font-semibold">Project Dashboard</h1>
                    {projectSchemas.length > 0 && (
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
                {projectSchemas.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <EmptyDashboard onActionClick={() => setSchemaBuilderOpen(true)} />
                    </div>
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
