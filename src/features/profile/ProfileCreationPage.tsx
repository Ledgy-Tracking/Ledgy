import React from 'react';
import { useNavigate } from 'react-router';
import { ProfileCreationForm } from './ProfileCreationForm';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../lib/utils';
import { Sparkles } from 'lucide-react';

export const ProfileCreationPage: React.FC = () => {
    const navigate = useNavigate();

    // Get density from UI store
    const density = useUIStore((state) => state.density) || 'comfortable';

    const handleCancel = () => {
        navigate('/'); // Navigate back to profile selector
    };

    const handleSuccess = (profileId: string) => {
        // The form handles navigation to /dashboard, but we can do extra logic here if needed
        console.log('Profile created successfully:', profileId);
    };

    // Adjust padding based on density
    const containerClasses = cn(
        "min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30",
        {
            'py-8': density === 'compact',
            'py-12': density === 'comfortable',
        }
    );

    return (
        <div className={containerClasses}>

            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] opacity-50 mix-blend-screen" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] opacity-30 mix-blend-screen" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-2xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both">

                {/* Header */}
                <div className="flex flex-col items-center justify-center text-center space-y-4 mb-10">
                    <div className="h-16 w-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-2 shadow-inner ring-1 ring-emerald-500/30">
                        <Sparkles className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                            Create a Profile
                        </h1>
                        <p className="text-zinc-400 text-lg max-w-md mx-auto leading-relaxed">
                            Your secure, isolated workspace. Give it a name to get started.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <ProfileCreationForm
                    onCancel={handleCancel}
                    onSuccess={handleSuccess}
                />

            </div>
        </div>
    );
};
