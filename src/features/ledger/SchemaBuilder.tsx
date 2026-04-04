import React, { useEffect, useState } from 'react';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useSchemaBuilderStore } from '../../stores/useSchemaBuilderStore';
import { useErrorStore } from '../../stores/useErrorStore';
import { FieldType } from '../../types/ledger';
import { Plus, Trash2, ChevronUp, ChevronDown, Save, Info } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { useForm } from 'react-hook-form';

interface SchemaBuilderFormValues {
    name: string;
}

interface SchemaBuilderProps {
    projectId: string;
    onClose: () => void;
}

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({ projectId, onClose }) => {
    const { activeProfileId } = useProfileStore();
    const { schemas } = useLedgerStore();
    const {
        draftName,
        setDraftName,
        draftFields,
        error,
        isLoading,
        editingSchemaId,
        initCreate,
        addField,
        removeField,
        updateField,
        reorderField,
        commit,
        discard,
    } = useSchemaBuilderStore();

    const [patternError, setPatternError] = useState<Record<number, string | null>>({});

    const form = useForm<SchemaBuilderFormValues>({
        defaultValues: {
            name: '',
        },
    });

    useEffect(() => {
        initCreate(projectId || '');
    }, [projectId, initCreate]);

    // Sync form value with draftName
    useEffect(() => {
        form.setValue('name', draftName);
    }, [draftName, form]);

    // Filter schemas to show as potential relation targets, excluding the current schema (self-target prevention)
    const availableLedgers = schemas
        .filter(s => s.projectId === projectId)
        .filter(s => s._id !== editingSchemaId);

    const handleMoveField = (index: number, direction: 'up' | 'down') => {
        const toIndex = direction === 'up' ? index - 1 : index + 1;
        reorderField(index, toIndex);
        setPatternError(prev => {
            const next = { ...prev };
            [next[index], next[toIndex]] = [prev[toIndex] ?? null, prev[index] ?? null];
            return next;
        });
    };

    const handleRemoveField = (index: number) => {
        removeField(index);
        setPatternError(prev => {
            const next: Record<number, string | null> = {};
            Object.entries(prev).forEach(([k, v]) => {
                const i = Number(k);
                if (i < index) next[i] = v;
                else if (i > index) next[i - 1] = v;
            });
            return next;
        });
    };

    const handleSave = async (data: SchemaBuilderFormValues) => {
        // Sync form data to store before committing
        setDraftName(data.name || '');

        if (!activeProfileId) {
            const msg = 'No active profile. Please select a profile before saving.';
            useSchemaBuilderStore.setState({ error: msg });
            useErrorStore.getState().dispatchError(msg);
            return;
        }
        try {
            await commit(activeProfileId);
            // Only close if validation passed (no error set by commit)
            if (!useSchemaBuilderStore.getState().error) {
                onClose();
            }
        } catch (err) {
            // PouchDB/network errors are already set in store and re-thrown
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <TooltipProvider>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Ledger Schema</DialogTitle>
                    <DialogDescription>Define the structure of your new ledger.</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6 mt-4">
                        {error && (
                            <Card className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                                <CardContent>
                                    <p className="text-red-700 dark:text-red-500 text-sm">{error}</p>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                rules={{ required: 'Schema name is required' }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                            Schema Name
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    setDraftName(e.target.value || '');
                                                }}
                                                placeholder="e.g. Coffee Tracker, Sleep Log"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                        Schema Fields
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={addField}
                                        className="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                                    >
                                        <Plus size={14} className="mr-1" /> Add Field
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {draftFields.map((field, index) => (
                                    <div
                                        key={index}
                                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
                                    >
                                        {/* Main controls row */}
                                        <div className="flex items-center gap-2 p-3">
                                            <div className="flex flex-col gap-1">
                                                <Button
                                                    type="button"
                                                    onClick={() => handleMoveField(index, 'up')}
                                                    disabled={index === 0}
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                                    aria-label="Move field up"
                                                >
                                                    <ChevronUp size={14} />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={() => handleMoveField(index, 'down')}
                                                    disabled={index === draftFields.length - 1}
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                                    aria-label="Move field down"
                                                >
                                                    <ChevronDown size={14} />
                                                </Button>
                                            </div>

                                            <Input
                                                placeholder="Field name"
                                                value={field.name}
                                                onChange={(e) => updateField(index, { name: e.target.value })}
                                                className="flex-1 bg-white dark:bg-zinc-900"
                                            />

                                            <Select
                                                value={field.type}
                                                onValueChange={(value) => {
                                                    updateField(index, { type: value as FieldType });
                                                    setPatternError(prev => ({ ...prev, [index]: null }));
                                                }}
                                            >
                                                <SelectTrigger className="w-[140px] bg-white dark:bg-zinc-900">
                                                    <SelectValue placeholder="Type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">Text</SelectItem>
                                                    <SelectItem value="long_text">Long Text</SelectItem>
                                                    <SelectItem value="number">Number</SelectItem>
                                                    <SelectItem value="date">Date</SelectItem>
                                                    <SelectItem value="boolean">Boolean</SelectItem>
                                                    <SelectItem value="select">Select</SelectItem>
                                                    <SelectItem value="multi_select">Multi-Select</SelectItem>
                                                    <SelectItem value="relation">Relation</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {field.type === 'relation' && (
                                                availableLedgers.length === 0 ? (
                                                    <Select disabled>
                                                        <SelectTrigger
                                                            title="No other ledgers available — a relation cannot target its own schema"
                                                            className="w-[160px] bg-white dark:bg-zinc-900 border-emerald-500/50 opacity-50 cursor-not-allowed"
                                                        >
                                                            <SelectValue placeholder="No targets available" />
                                                        </SelectTrigger>
                                                    </Select>
                                                ) : (
                                                    <Select
                                                        value={field.relationTarget || ''}
                                                        onValueChange={(value) => updateField(index, { relationTarget: value })}
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
                                                )
                                            )}

                                            <div className="flex items-center gap-1 ml-2">
                                                <Checkbox
                                                    id={`field-required-${index}`}
                                                    checked={field.required}
                                                    onCheckedChange={(checked) => updateField(index, { required: checked === true })}
                                                />
                                                <Label 
                                                    htmlFor={`field-required-${index}`}
                                                    className="text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer"
                                                >
                                                    Required
                                                </Label>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveField(index)}
                                                className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                aria-label="Remove field"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>

                                        {/* Text / Long Text constraint sub-panel */}
                                        {(field.type === 'text' || field.type === 'long_text') && (
                                            <div className="flex items-start gap-3 px-3 pb-3 pt-0 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                                                <label className="flex flex-col gap-1 mt-2">
                                                    Min Length
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        className="w-20 h-7 text-xs bg-white dark:bg-zinc-950"
                                                        value={field.minLength ?? ''}
                                                        onChange={(e) => updateField(index, { minLength: e.target.value === '' ? undefined : Number(e.target.value) })}
                                                        placeholder="0"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-1 mt-2">
                                                    Max Length
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        className="w-20 h-7 text-xs bg-white dark:bg-zinc-950"
                                                        value={field.maxLength ?? ''}
                                                        onChange={(e) => updateField(index, { maxLength: e.target.value === '' ? undefined : Number(e.target.value) })}
                                                        placeholder="∞"
                                                    />
                                                </label>
                                                <div className="flex flex-col gap-1 flex-1 mt-2">
                                                    <span className="flex items-center gap-1">
                                                        Pattern (RegEx)
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Info size={12} className="text-zinc-400 cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="max-w-xs">
                                                                JavaScript RegExp source string, e.g. '^[A-Z]' matches strings starting with a capital letter. No leading/trailing delimiters.
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </span>
                                                    <Input
                                                        type="text"
                                                        className="h-7 text-xs bg-white dark:bg-zinc-950"
                                                        value={field.pattern ?? ''}
                                                        onChange={(e) => updateField(index, { pattern: e.target.value === '' ? undefined : e.target.value })}
                                                        onBlur={(e) => {
                                                            if (e.target.value) {
                                                                try {
                                                                    new RegExp(e.target.value);
                                                                    setPatternError(prev => ({ ...prev, [index]: null }));
                                                                } catch {
                                                                    setPatternError(prev => ({ ...prev, [index]: 'Invalid RegEx pattern' }));
                                                                }
                                                            } else {
                                                                setPatternError(prev => ({ ...prev, [index]: null }));
                                                            }
                                                        }}
                                                        placeholder="e.g. ^[A-Z]"
                                                    />
                                                    {patternError[index] && (
                                                        <span className="text-red-500 text-xs">{patternError[index]}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Number constraint sub-panel */}
                                        {field.type === 'number' && (
                                            <div className="flex items-start gap-3 px-3 pb-3 pt-0 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                                                <label className="flex flex-col gap-1 mt-2">
                                                    Min
                                                    <Input
                                                        type="number"
                                                        className="w-24 h-7 text-xs bg-white dark:bg-zinc-950"
                                                        value={field.min ?? ''}
                                                        onChange={(e) => updateField(index, { min: e.target.value === '' ? undefined : Number(e.target.value) })}
                                                        placeholder="–∞"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-1 mt-2">
                                                    Max
                                                    <Input
                                                        type="number"
                                                        className="w-24 h-7 text-xs bg-white dark:bg-zinc-950"
                                                        value={field.max ?? ''}
                                                        onChange={(e) => updateField(index, { max: e.target.value === '' ? undefined : Number(e.target.value) })}
                                                        placeholder="∞"
                                                    />
                                                </label>
                                            </div>
                                        )}

                                        {/* Date constraint sub-panel */}
                                        {field.type === 'date' && (
                                            <div className="flex items-start gap-3 px-3 pb-3 pt-0 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                                                <div className="flex flex-col gap-1 mt-2">
                                                    <span className="flex items-center gap-1">
                                                        Date Format
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Info size={12} className="text-zinc-400 cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="max-w-xs">
                                                                Specify the expected date format. Leave empty to accept any valid date string.
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </span>
                                                    <Select
                                                        value={field.dateFormat ?? '__none__'}
                                                        onValueChange={(value) => updateField(index, { dateFormat: (value === '__none__' ? undefined : value) as 'YYYY-MM-DD' | 'YYYY-MM-DDTHH:mm:ssZ' | undefined })}
                                                    >
                                                        <SelectTrigger className="w-[200px] h-7 text-xs bg-white dark:bg-zinc-950">
                                                            <SelectValue placeholder="Any valid date" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__none__">Any valid date (no constraint)</SelectItem>
                                                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (date only)</SelectItem>
                                                            <SelectItem value="YYYY-MM-DDTHH:mm:ssZ">YYYY-MM-DDTHH:mm:ssZ (full ISO)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <label className="flex flex-col gap-1 mt-2">
                                                    Min Date
                                                    <Input
                                                        type="date"
                                                        className="h-7 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2"
                                                        value={field.dateMin ?? ''}
                                                        onChange={(e) => updateField(index, { dateMin: e.target.value || undefined })}
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-1 mt-2">
                                                    Max Date
                                                    <Input
                                                        type="date"
                                                        className="h-7 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2"
                                                        value={field.dateMax ?? ''}
                                                        onChange={(e) => updateField(index, { dateMax: e.target.value || undefined })}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {draftFields.length === 0 && (
                                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                                        No fields yet. Click "Add Field" to get started.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <Button type="button" variant="outline" onClick={() => { discard(); onClose(); }}>
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
                </Form>
            </DialogContent>
            </TooltipProvider>
        </Dialog>
    );
};
