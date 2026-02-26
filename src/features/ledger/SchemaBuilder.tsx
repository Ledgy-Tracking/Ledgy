import React, { useState } from 'react';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useErrorStore } from '../../stores/useErrorStore';
import { SchemaField, FieldType } from '../../types/ledger';
import { X, Plus, Trash2, ChevronUp, ChevronDown, Save } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

interface SchemaBuilderProps {
    projectId: string;
    onClose: () => void;
}

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({ projectId, onClose }) => {
    const { activeProfileId } = useProfileStore();
    const { createSchema, isLoading, schemas } = useLedgerStore();
    const { dispatchError } = useErrorStore();

    const [schemaName, setSchemaName] = useState('');
    const [fields, setFields] = useState<SchemaField[]>([]);
    const [localError, setLocalError] = useState<string | null>(null);

    // Filter schemas to show as potential relation targets
    const availableLedgers = schemas.filter(s => s.projectId === projectId);

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
        setLocalError(null);

        if (!schemaName.trim()) {
            const msg = 'Schema name is required';
            setLocalError(msg);
            dispatchError(msg);
            return;
        }
        if (fields.length === 0) {
            const msg = 'At least one field is required';
            setLocalError(msg);
            dispatchError(msg);
            return;
        }

        // Validate relation fields
        for (const field of fields) {
            if (field.type === 'relation' && !field.relationTarget) {
                const msg = `Relation target required for field "${field.name || 'unnamed'}"`;
                setLocalError(msg);
                dispatchError(msg);
                return;
            }
        }

        if (!activeProfileId) {
            const msg = 'No active profile selected';
            setLocalError(msg);
            dispatchError(msg);
            return;
        }

        try {
            await createSchema(activeProfileId, projectId, schemaName.trim(), fields);
            onClose();
        } catch (err: any) {
            setLocalError(err.message || 'Failed to create schema');
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Ledger Schema</DialogTitle>
                    <DialogDescription>Define the structure of your new ledger.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-6 mt-4">
                    {localError && (
                        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                            <p className="text-red-700 dark:text-red-500 text-sm">{localError}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Schema Name
                            </label>
                            <Input
                                required
                                value={schemaName}
                                onChange={(e) => setSchemaName(e.target.value)}
                                placeholder="e.g. Coffee Tracker, Sleep Log"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    Schema Fields
                                </label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleAddField}
                                    className="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                                >
                                    <Plus size={14} className="mr-1" /> Add Field
                                </Button>
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

                                        <Input
                                            placeholder="Field name"
                                            value={field.name}
                                            onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                                            className="flex-1 bg-white dark:bg-zinc-900"
                                        />

                                        <Select
                                            value={field.type}
                                            onValueChange={(value) => handleFieldChange(index, 'type', value as FieldType)}
                                        >
                                            <SelectTrigger className="w-[120px] bg-white dark:bg-zinc-900">
                                                <SelectValue placeholder="Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Text</SelectItem>
                                                <SelectItem value="number">Number</SelectItem>
                                                <SelectItem value="date">Date</SelectItem>
                                                <SelectItem value="relation">Relation</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {field.type === 'relation' && (
                                            <Select
                                                value={field.relationTarget || ''}
                                                onValueChange={(value) => handleFieldChange(index, 'relationTarget', value)}
                                            >
                                                <SelectTrigger className="w-[160px] bg-white dark:bg-zinc-900 border-emerald-500/50">
                                                    <SelectValue placeholder="Select Target..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableLedgers.map(ledger => (
                                                        <SelectItem key={ledger._id} value={ledger._id}>
                                                            {ledger.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        <label className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 ml-2">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                                                className="rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                                            />
                                            Required
                                        </label>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveField(index)}
                                            className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                ))}

                                {fields.length === 0 && (
                                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                                        No fields yet. Click "Add Field" to get started.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
                            {isLoading && (
                                <div className="w-4 h-4 mr-2 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                            )}
                            <Save size={16} className="mr-2" />
                            Create Schema
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
