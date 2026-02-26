import React, { useState, useRef, useEffect } from 'react';
import { LedgerSchema, SchemaField, LedgerEntry } from '../../types/ledger';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { RelationCombobox } from './RelationCombobox';
import { TableRow, TableCell } from '../../components/ui/table';

interface InlineEntryRowProps {
    schema: LedgerSchema;
    entry?: LedgerEntry;
    onCancel: () => void;
    onComplete: () => void;
}

export const InlineEntryRow: React.FC<InlineEntryRowProps> = ({
    schema,
    entry,
    onCancel,
    onComplete,
}) => {
    const { createEntry, updateEntry } = useLedgerStore();
    const { activeProfileId } = useProfileStore();
    const [formData, setFormData] = useState<Record<string, unknown>>(entry?.data || {});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const inputRefs = useRef<(HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null)[]>([]);
    const [targetEntries, setTargetEntries] = useState<Record<string, LedgerEntry[]>>({});

    // Load target ledger entries for relation fields
    useEffect(() => {
        const loadRelationTargets = async () => {
            const relationFields = schema.fields.filter(f => f.type === 'relation' && f.relationTarget);
            if (relationFields.length === 0 || !activeProfileId) return;

            const entriesMap: Record<string, LedgerEntry[]> = {};
            for (const field of relationFields) {
                try {
                    await useLedgerStore.getState().fetchEntries(activeProfileId, field.relationTarget!);
                    entriesMap[field.name] = useLedgerStore.getState().entries[field.relationTarget!] || [];
                } catch (e) {
                    console.warn(`Failed to load entries for ${field.relationTarget}`);
                }
            }
            setTargetEntries(entriesMap);
        };

        loadRelationTargets();
    }, [schema.fields, activeProfileId]);

    // Focus first field on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleFieldChange = (fieldName: string, value: unknown) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        // Clear error when user types
        if (errors[fieldName]) {
            setErrors(prev => ({ ...prev, [fieldName]: '' }));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, fieldIndex: number) => {
        switch (e.key) {
            case 'Tab':
                // Natural tab behavior
                break;
            case 'Enter':
                e.preventDefault();
                if (fieldIndex < schema.fields.length - 1) {
                    // Move to next field
                    inputRefs.current[fieldIndex + 1]?.focus();
                } else {
                    // Last field - commit
                    handleSubmit();
                }
                break;
            case 'Escape':
                e.preventDefault();
                onCancel();
                break;
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        schema.fields.forEach(field => {
            if (field.required && (formData[field.name] === null || formData[field.name] === undefined || formData[field.name] === '')) {
                newErrors[field.name] = 'Required';
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        if (!activeProfileId) {
            setErrors({ _form: 'No active profile' });
            return;
        }

        try {
            if (entry) {
                await updateEntry(entry._id, formData);
            } else {
                await createEntry(
                    activeProfileId,
                    schema._id,
                    schema._id, // ledgerId same as schemaId for now
                    formData
                );
            }
            setFormData({});
            onComplete();
        } catch (err: any) {
            setErrors({ _form: err.message || 'Failed to save entry' });
        }
    };

    return (
        <TableRow className="bg-emerald-50 dark:bg-emerald-900/10 animate-in slide-in-from-top-2 duration-150">
            {schema.fields.map((field, index) => (
                <TableCell
                    key={field.name}
                    className="p-2 relative border-r border-zinc-200 dark:border-zinc-800 last:border-r-0"
                >
                    <FieldInput
                        ref={el => { inputRefs.current[index] = el; }}
                        field={field}
                        value={formData[field.name]}
                        onChange={(value) => handleFieldChange(field.name, value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        error={errors[field.name]}
                        targetEntries={targetEntries}
                    />
                </TableCell>
            ))}
            {/* Action buttons/Error display cell */}
            <TableCell className="p-2 w-[150px]">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSubmit}
                            className="px-3 py-1 text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded font-bold transition-colors"
                            aria-label="Save entry"
                        >
                            Save
                        </button>
                        <button
                            onClick={onCancel}
                            className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                            aria-label="Cancel"
                        >
                            Cancel
                        </button>
                    </div>
                    {errors._form && (
                        <div className="text-red-500 text-[10px] font-medium leading-tight mt-1">
                            {errors._form}
                        </div>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
};

interface FieldInputProps {
    field: SchemaField;
    value: unknown;
    onChange: (value: unknown) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    error?: string;
    targetEntries: Record<string, LedgerEntry[]>;
}

const FieldInput = React.forwardRef<HTMLInputElement | HTMLSelectElement | HTMLButtonElement, FieldInputProps>(
    ({ field, value, onChange, onKeyDown, error, targetEntries }, ref) => {
        const baseClasses = `w-full bg-transparent border ${error ? 'border-red-500' : 'border-zinc-700'} rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`;

        const renderInput = () => {
            switch (field.type) {
                case 'number':
                    return (
                        <input
                            ref={ref as React.RefObject<HTMLInputElement>}
                            type="number"
                            className={baseClasses}
                            value={value as string || ''}
                            onChange={(e) => onChange(e.target.valueAsNumber || 0)}
                            onKeyDown={onKeyDown}
                            placeholder={`Enter ${field.name}`}
                        />
                    );
                case 'date':
                    return (
                        <input
                            ref={ref as React.RefObject<HTMLInputElement>}
                            type="date"
                            className={baseClasses}
                            value={value as string || ''}
                            onChange={(e) => onChange(e.target.value)}
                            onKeyDown={onKeyDown}
                        />
                    );
                case 'relation':
                    return (
                        <RelationCombobox
                            ref={ref as React.RefObject<HTMLButtonElement>}
                            entries={targetEntries[field.name] || []}
                            value={value as string | string[]}
                            onChange={(newValue) => onChange(newValue)}
                            placeholder={`Select ${field.name}...`}
                            allowMultiple={true}
                            getDisplayValue={(entry) => {
                                // Get first non-ID field value for display
                                const data = entry.data || {};
                                const firstValue = Object.values(data)[0];
                                return firstValue ? String(firstValue) : entry._id.slice(-8);
                            }}
                        />
                    );
                default: // text
                    return (
                        <input
                            ref={ref as React.RefObject<HTMLInputElement>}
                            type="text"
                            className={baseClasses}
                            value={value as string || ''}
                            onChange={(e) => onChange(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder={`Enter ${field.name}`}
                        />
                    );
            }
        };

        return (
            <div className="relative">
                {renderInput()}
                {error && (
                    <span className="absolute left-0 -bottom-4 text-[10px] text-red-500 font-medium">
                        {error}
                    </span>
                )}
            </div>
        );
    }
);

FieldInput.displayName = 'FieldInput';
