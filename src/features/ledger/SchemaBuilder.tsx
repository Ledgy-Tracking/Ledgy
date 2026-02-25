import React, { useState } from 'react';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { SchemaField, FieldType } from '../../types/ledger';
import { X, Plus, Trash2, ChevronUp, ChevronDown, Save } from 'lucide-react';

interface SchemaBuilderProps {
    projectId: string;
    onClose: () => void;
}

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({ projectId, onClose }) => {
    const { activeProfileId } = useProfileStore();
    const { createSchema, isLoading } = useLedgerStore();

    const [schemaName, setSchemaName] = useState('');
    const [fields, setFields] = useState<SchemaField[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleAddField = () => {
        setFields([...fields, { name: '', type: 'text', required: false }]);
    };

    const handleRemoveField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const handleMoveField = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) ||
            (direction === 'down' && index === fields.length - 1)) {
            return;
        }
        const newFields = [...fields];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
        setFields(newFields);
    };

    const handleFieldChange = (index: number, key: keyof SchemaField, value: any) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], [key]: value };
        setFields(newFields);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schemaName.trim()) {
            setError('Schema name is required');
            return;
        }
        if (fields.length === 0) {
            setError('At least one field is required');
            return;
        }
        if (!activeProfileId) {
            setError('No active profile selected');
            return;
        }

        try {
            setError(null);
            await createSchema(activeProfileId, projectId, schemaName.trim(), fields);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create schema');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 dark:bg-black/70 backdrop-blur-sm p-4">
            <form
                onSubmit={handleSave}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Create Ledger Schema</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                        <p className="text-red-700 dark:text-red-500 text-sm">{error}</p>
                    </div>
                )}

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                            Schema Name
                        </label>
                        <input
                            type="text"
                            required
                            value={schemaName}
                            onChange={(e) => setSchemaName(e.target.value)}
                            placeholder="e.g. Coffee Tracker, Sleep Log"
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                Schema Fields
                            </label>
                            <button
                                type="button"
                                onClick={handleAddField}
                                className="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                            >
                                <Plus size={14} /> Add Field
                            </button>
                        </div>

                        <div className="space-y-2">
                            {fields.map((field, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                                >
                                    <div className="flex flex-col gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveField(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronUp size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveField(index, 'down')}
                                            disabled={index === fields.length - 1}
                                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Field name"
                                        value={field.name}
                                        onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                                        className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                                    />

                                    <select
                                        value={field.type}
                                        onChange={(e) => handleFieldChange(index, 'type', e.target.value as FieldType)}
                                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                                    >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                        <option value="relation">Relation</option>
                                    </select>

                                    {field.type === 'relation' && (
                                        <input
                                            type="text"
                                            placeholder="Target ledger ID"
                                            value={field.relationTarget || ''}
                                            onChange={(e) => handleFieldChange(index, 'relationTarget', e.target.value)}
                                            className="w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                                        />
                                    )}

                                    <label className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                                            className="rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        Required
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveField(index)}
                                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
                                    No fields yet. Click "Add Field" to get started.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !schemaName.trim() || fields.length === 0}
                        className="px-4 py-2 rounded-lg font-bold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-emerald-500/50 flex items-center gap-2"
                    >
                        {isLoading && (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        <Save size={16} />
                        Create Schema
                    </button>
                </div>
            </form>
        </div>
    );
};
