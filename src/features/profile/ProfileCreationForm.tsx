import React, { useState } from 'react';
import { useProfileStore } from '../../stores/useProfileStore';
import { useErrorStore } from '../../stores/useErrorStore';
import { useNavigate } from 'react-router';
import { Avatar } from '../../components/ui/Avatar';
import { ColorPicker, DEFAULT_PRESET_COLORS } from '../../components/ui/ColorPicker';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Loader2 } from 'lucide-react';

interface ProfileCreationFormProps {
    onCancel?: () => void;
    onSuccess?: (profileId: string) => void;
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
    const [name, setName] = useState('');
    const [color, setColor] = useState(DEFAULT_PRESET_COLORS[0]);
    const [avatarInput, setAvatarInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived state
    const derivedInitials = avatarInput.trim() || generateInitials(name);

    // Validation
    const nameEmpty = !name.trim();
    const nameTooLong = name.length > 50;
    const nameInvalidFormat = !/^[a-zA-Z0-9\s\-_]*$/.test(name);

    const isFormValid = !nameEmpty && !nameTooLong && !nameInvalidFormat;

    const { createProfile, setActiveProfile, profiles } = useProfileStore();
    const { dispatchError } = useErrorStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid) return;

        try {
            setIsSubmitting(true);

            // Check for duplicate name
            const exists = profiles.some(p => p.name.toLowerCase() === name.trim().toLowerCase());
            if (exists) {
                throw new Error('Profile name already exists');
            }

            // Create profile
            const profileId = await createProfile(
                name.trim(),
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
        <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-md mx-auto" noValidate>

            {/* Header/Preview Area */}
            <div className="flex flex-col items-center justify-center space-y-4 pt-4 pb-6 border-b border-white/10">
                <Avatar
                    size="2xl"
                    color={color}
                    initials={derivedInitials}
                    className="shadow-xl ring-4 ring-zinc-950 transition-all duration-300"
                />
                <div className="text-center space-y-1">
                    <h3 className="text-xl font-medium text-white truncate max-w-xs px-4">
                        {name.trim() || 'New Profile'}
                    </h3>
                    <p className="text-sm text-zinc-400">Preview</p>
                </div>
            </div>

            <div className="space-y-6 pt-2">
                {/* Profile Name Field */}
                <div className="space-y-2">
                    <Label htmlFor="profile-name" className="text-zinc-300 font-medium flex justify-between">
                        <span>Profile Name <span className="text-red-400">*</span></span>
                        <span className="text-xs text-zinc-500 font-normal">{name.length}/50</span>
                    </Label>
                    <Input
                        id="profile-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Personal Finances, Work Tasks..."
                        maxLength={50}
                        autoFocus
                        aria-invalid={nameTooLong || nameInvalidFormat}
                        aria-describedby="name-error"
                        className="bg-zinc-900 border-zinc-800 placeholder:text-zinc-600 focus-visible:ring-emerald-500 text-lg py-6"
                    />
                    <div id="name-error" className="min-h-[20px] text-sm font-medium text-red-400">
                        {nameTooLong && "Name cannot exceed 50 characters."}
                        {nameInvalidFormat && "Only letters, numbers, spaces, hyphens, and underscores allowed."}
                    </div>
                </div>

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
                <div className="space-y-2">
                    <Label htmlFor="profile-avatar" className="text-zinc-300 font-medium flex justify-between">
                        <span>Avatar Initials <span className="text-zinc-500 font-normal">(Optional)</span></span>
                    </Label>
                    <Input
                        id="profile-avatar"
                        value={avatarInput}
                        onChange={(e) => setAvatarInput(e.target.value)}
                        placeholder="Auto-generated if empty"
                        maxLength={2}
                        className="bg-zinc-900 border-zinc-800 placeholder:text-zinc-600 focus-visible:ring-emerald-500 max-w-[120px] text-center tracking-widest uppercase"
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 w-full mt-8">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white"
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-emerald-500/20 shadow-lg"
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
        </form>
    );
};
