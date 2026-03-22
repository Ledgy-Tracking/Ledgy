import { useUIStore } from '../../stores/useUIStore';
import { Sun, Moon, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SettingsPage = () => {
    const { theme, density, setTheme, setDensity, resetToDefaults } = useUIStore();

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">
                Settings
            </h1>

            {/* Appearance Section */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <Maximize2 className="w-5 h-5" />
                    Appearance
                </h2>

                <div className="bg-gray-50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-lg shadow-sm border border-white/5 divide-y divide-white/5">
                    {/* Theme Setting */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-zinc-800/50 rounded-lg">
                                {theme === 'dark' ? (
                                    <Moon className="w-5 h-5 text-zinc-400" />
                                ) : (
                                    <Sun className="w-5 h-5 text-zinc-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-medium text-zinc-900 dark:text-white">Theme</h3>
                                <p className="text-sm text-zinc-400">
                                    Choose between light and dark mode
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setTheme('light')}
                                size="sm"
                                variant={theme === 'light' ? 'default' : 'outline'}
                                className={theme === 'light'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                }
                            >
                                Light
                            </Button>
                            <Button
                                onClick={() => setTheme('dark')}
                                size="sm"
                                variant={theme === 'dark' ? 'default' : 'outline'}
                                className={theme === 'dark'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                }
                            >
                                Dark
                            </Button>
                        </div>
                    </div>

                    {/* Density Setting */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-zinc-800/50 rounded-lg">
                                {density === 'compact' ? (
                                    <Minimize2 className="w-5 h-5 text-zinc-400" />
                                ) : (
                                    <Maximize2 className="w-5 h-5 text-zinc-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-medium text-zinc-900 dark:text-white">Density</h3>
                                <p className="text-sm text-zinc-400">
                                    Control the spacing and size of UI elements
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setDensity('comfortable')}
                                size="sm"
                                variant={density === 'comfortable' ? 'default' : 'outline'}
                                className={density === 'comfortable'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                }
                            >
                                Comfortable
                            </Button>
                            <Button
                                onClick={() => setDensity('compact')}
                                size="sm"
                                variant={density === 'compact' ? 'default' : 'outline'}
                                className={density === 'compact'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                }
                            >
                                Compact
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reset Section */}
            <section>
                <h2 className="text-xl font-semibold text-white mb-4">
                    Reset Settings
                </h2>

                <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
                    <p className="text-sm text-amber-300 mb-4">
                        Reset all settings to their default values. This action cannot be undone.
                    </p>
                    <Button
                        onClick={resetToDefaults}
                        variant="outline"
                        className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 font-medium border-amber-600/30"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Defaults
                    </Button>
                </div>
            </section>

            {/* Future Settings Placeholder */}
            <section className="mt-8 opacity-50">
                <h2 className="text-xl font-semibold text-white mb-4">
                    Coming Soon
                </h2>

                <div className="bg-gray-50 dark:bg-zinc-900/30 border border-white/5 rounded-lg p-4">
                    <p className="text-sm text-zinc-500">
                        Additional settings will be available in future updates:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-zinc-500">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                            Language & Locale
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                            Notification Preferences
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                            Keyboard Shortcuts
                            <span className="text-xs text-zinc-600">
                                (Undo: Ctrl/Cmd+Z, Redo: Ctrl/Cmd+Shift+Z)
                            </span>
                        </li>
                    </ul>
                </div>
            </section>
        </div>
    );
};
