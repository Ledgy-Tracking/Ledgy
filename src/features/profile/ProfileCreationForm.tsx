import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useProfileStore } from '../../stores/useProfileStore';
import { useErrorStore } from '../../stores/useErrorStore';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { ColorPicker, DEFAULT_PRESET_COLORS } from '../../components/ui/ColorPicker';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface ProfileCreationFormProps {
    onCancel?: () => void;
    onSuccess?: (profileId: string) => void;
}

interface ProfileFormValues {
    name: string;
    avatar: string;
}

const generateInitials = (name: string): string => {
    if (!name.trim()) return '';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

export const ProfileCreationForm: React.FC<ProfileCreationFormProps> = ({ onCancel, onSuccess }) => {
    const [color, setColor] = useState(DEFAULT_PRESET_COLORS[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { createProfile, setActiveProfile, profiles } = useProfileStore();
    const { dispatchError } = useErrorStore();
    const navigate = useNavigate();

    const form = useForm<ProfileFormValues>({
        defaultValues: {
            name: '',
            avatar: ''
        }
    });

    const { watch, control } = form;
    const nameValue = watch('name');
    const avatarValue = watch('avatar');

    // Derived state
    const derivedInitials = avatarValue.trim() || generateInitials(nameValue);

    const onSubmit = async (data: ProfileFormValues) => {
        if (!data.name.trim()) return;

        try {
            setIsSubmitting(true);

            // Check for duplicate name
            const exists = profiles.some(p => p.name.toLowerCase() === data.name.trim().toLowerCase());
            if (exists) {
                throw new Error('Profile name already exists');
            }

            // Create profile
            const profileId = await createProfile(
                data.name.trim(),
                undefined,
                color,
                derivedInitials.substring(0, 2)
            );

            // Auto-switch to new profile
            setActiveProfile(profileId);

            // Navigate to dashboard
            navigate('/dashboard');

            onSuccess?.(profileId);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create profile';
            dispatchError(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-md mx-auto" noValidate>
            <Form {...form}>

                {/* Header/Preview Area */}
                <div className="flex flex-col items-center justify-center space-y-4 pt-4 pb-6 border-b border-white/10">
                    <Avatar
                        size="2xl"
                        color={color}
                        initials={derivedInitials}
                        className="shadow-xl ring-4 ring-zinc-950 transition-all duration-300"
                    />
                    <div className="text-center space-y-1">
                        <h3 className="text-xl font-medium text-zinc-900 dark:text-white truncate max-w-xs px-4">
                            {nameValue.trim() || 'New Profile'}
                        </h3>
                        <p className="text-sm text-zinc-400">Preview</p>
                    </div>
                </div>

                <div className="space-y-6 pt-2">
                    {/* Profile Name Field */}
                    <FormField
                        control={control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <FormLabel className="text-zinc-300 font-medium">
                                        Profile Name <span className="text-red-400">*</span>
                                    </FormLabel>
                                    <span className="text-xs text-zinc-500 font-normal">{nameValue.length}/50</span>
                                </div>
                                <FormControl>
                                    <Input
                                        id="profile-name"
                                        {...field}
                                        placeholder="e.g., Personal Finances, Work Tasks..."
                                        maxLength={50}
                                        autoFocus
                                        className="bg-zinc-900 border-zinc-800 placeholder:text-zinc-600 focus-visible:ring-emerald-500 text-lg py-6"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Profile Color Field */}
                    <div className="space-y-3">
                        <Label id="color-picker-label" className="text-zinc-300 font-medium">
                            Theme Color
                        </Label>
                        <ColorPicker
                            value={color}
                            onChange={setColor}
                            aria-labelledby="color-picker-label"
                        />
                    </div>

                    {/* Avatar Override Field (Optional) */}
                    <FormField
                        control={control}
                        name="avatar"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-zinc-300 font-medium flex justify-between">
                                    <span>Avatar Initials <span className="text-zinc-500 font-normal">(Optional)</span></span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        id="profile-avatar"
                                        {...field}
                                        placeholder="Auto-generated if empty"
                                        maxLength={2}
                                        className="bg-zinc-900 border-zinc-800 placeholder:text-zinc-600 focus-visible:ring-emerald-500 max-w-[120px] text-center tracking-widest uppercase"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 w-full mt-8">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="flex-1 bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-zinc-900 dark:text-white font-medium shadow-emerald-500/20 shadow-lg"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Profile'
                        )}
                    </Button>
                </div>
            </Form>
        </form>
    );
};
