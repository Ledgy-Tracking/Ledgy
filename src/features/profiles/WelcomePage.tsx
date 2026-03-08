import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseZap, Sun, Moon, ArrowRight, Sparkles } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

export const WelcomePage: React.FC = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useUIStore();


    return (
        <div
            role="main"
            aria-label="Welcome to Ledgy"
            className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-8 relative overflow-hidden transition-colors duration-300"
        >
            {/* Ambient background glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[100px]" />
            </div>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="absolute top-8 right-8 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Main content */}
            <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center space-y-10">

                {/* Icon */}
                <div
                    aria-hidden="true"
                    className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/30 shadow-xl shadow-emerald-500/10"
                >
                    <DatabaseZap
                        size={44}
                        className="text-emerald-500 dark:text-emerald-400"
                        strokeWidth={1.5}
                    />
                    <Sparkles
                        size={16}
                        className="absolute -top-2 -right-2 text-cyan-400 dark:text-cyan-300"
                        strokeWidth={2}
                    />
                </div>

                {/* Headline */}
                <div className="space-y-4">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
                        <span className="block text-zinc-900 dark:text-zinc-100">Welcome to</span>
                        <span className="block bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 dark:from-emerald-400 dark:via-emerald-300 dark:to-cyan-400 bg-clip-text text-transparent">
                            Ledgy.
                        </span>
                    </h1>
                    <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                        Your personal data toolkit. Structured, private, and always yours.
                    </p>
                </div>

                {/* Feature pills */}
                <div
                    aria-label="Key features"
                    className="flex flex-wrap items-center justify-center gap-3"
                >
                    {[
                        '🔒 End-to-end encrypted',
                        '📴 Works offline',
                        '🗄️ Structured data',
                    ].map((feature) => (
                        <span
                            key={feature}
                            className="px-4 py-2 rounded-full text-sm font-medium bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        >
                            {feature}
                        </span>
                    ))}
                </div>

                {/* CTA Button */}
                <button
                    id="create-first-profile-btn"
                    onClick={() => navigate('/profiles/new')}
                    aria-label="Create your first profile"
                    className="group flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-bold text-lg rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/35 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-50 dark:focus:ring-offset-zinc-950"
                >
                    Create Your First Profile
                    <ArrowRight
                        size={20}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                    />
                </button>

                {/* Sub-hint */}
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                    Profiles isolate your data — create one per project, context, or role.
                </p>
            </div>
        </div>
    );
};
