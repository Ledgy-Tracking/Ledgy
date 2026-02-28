import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { FileText, Calendar, Hash, Tag, Type, Trash2, Save, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const EntryInspector: React.FC = () => {
    const { selectedEntryId, setSelectedEntryId } = useUIStore();
    const { schemas, entries, updateEntry, deleteEntry } = useLedgerStore();

    // Find the entry across all ledgers
    let entry: any = null;
    let entrySchema: any = null;

    for (const ledgerId in entries) {
        const found = entries[ledgerId].find(e => e._id === selectedEntryId);
        if (found) {
            entry = found;
            entrySchema = schemas.find(s => s._id === entry.schemaId);
            break;
        }
    }

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (entry) {
            setFormData({ ...entry.data });
        }
    }, [entry]);

    if (!entry || !entrySchema) {
        return (
            <div className="p-8 text-center text-zinc-500">
                <Info className="mx-auto mb-2 opacity-20" size={48} />
                <p className="text-sm">Select a ledger entry to inspect its properties.</p>
            </div>
        );
    }

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateEntry(entry._id, formData);
            // Optionally close inspector or show success
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            await deleteEntry(entry._id);
            setSelectedEntryId(null);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Entry Inspector</h2>
                </div>
                <div className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-bold uppercase">
                    {entrySchema.name}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                <div className="space-y-4">
                    {entrySchema.fields.map((field: any) => (
                        <div key={field.name} className="space-y-1.5">
                            <Label className="text-xs text-zinc-500 flex items-center gap-1.5">
                                <FieldIcon type={field.type} />
                                {field.name}
                            </Label>
                            {field.type === 'number' ? (
                                <Input
                                    type="number"
                                    value={formData[field.name] ?? ''}
                                    onChange={(e) => setFormData({ ...formData, [field.name]: Number(e.target.value) })}
                                    className="bg-white dark:bg-zinc-900"
                                />
                            ) : (
                                <Input
                                    value={formData[field.name] ?? ''}
                                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                    className="bg-white dark:bg-zinc-900"
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold mb-4">Metadata</p>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500 flex items-center gap-1.5"><Hash size={12} /> ID</span>
                            <span className="text-zinc-900 dark:text-zinc-100 font-mono">{entry._id.slice(-8)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500 flex items-center gap-1.5"><Calendar size={12} /> Created</span>
                            <span className="text-zinc-900 dark:text-zinc-100">
                                {new Date(entry.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 flex gap-2">
                <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleDelete}
                >
                    <Trash2 size={16} />
                    Delete
                </Button>
                <Button
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
            </div>
        </div>
    );
};

const FieldIcon: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
        case 'number': return <Hash size={12} className="text-amber-500" />;
        case 'date': return <Calendar size={12} className="text-purple-500" />;
        case 'relation': return <Tag size={12} className="text-emerald-500" />;
        default: return <Type size={12} className="text-blue-500" />;
    }
};
