import { useUIStore, Theme, Density } from '../../stores/useUIStore';
import { Sun, Moon, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

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

                <Card className="bg-gray-50 dark:bg-zinc-900/50 backdrop-blur-xl border-white/5 divide-y divide-white/5">
                    {/* Theme Setting */}
                    <CardContent className="p-4 flex items-center justify-between">
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
                            <Tabs value={theme} onValueChange={(value: string) => setTheme(value as Theme)}>
                                <TabsList className="bg-zinc-100 dark:bg-zinc-800">
                                    <TabsTrigger value="light" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30">
                                        <Sun className="w-4 h-4 mr-2" />
                                        Light
                                    </TabsTrigger>
                                    <TabsTrigger value="dark" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30">
                                        <Moon className="w-4 h-4 mr-2" />
                                        Dark
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardContent>

                    {/* Density Setting */}
                    <CardContent className="p-4 flex items-center justify-between">
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
                            <Tabs value={density} onValueChange={(value: string) => setDensity(value as Density)}>
                                <TabsList className="bg-zinc-100 dark:bg-zinc-800">
                                    <TabsTrigger value="comfortable" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30">
                                        <Maximize2 className="w-4 h-4 mr-2" />
                                        Comfortable
                                    </TabsTrigger>
                                    <TabsTrigger value="compact" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30">
                                        <Minimize2 className="w-4 h-4 mr-2" />
                                        Compact
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Reset Section */}
            <section>
                <h2 className="text-xl font-semibold text-white mb-4">
                    Reset Settings
                </h2>

                <Card className="bg-amber-500/20 border border-amber-500/30">
                    <CardContent className="p-4">
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
                    </CardContent>
                </Card>
            </section>

            {/* Future Settings Placeholder */}
            <section className="mt-8 opacity-50">
                <h2 className="text-xl font-semibold text-white mb-4">
                    Coming Soon
                </h2>

                <Card className="bg-gray-50 dark:bg-zinc-900/30 border-white/5">
                    <CardContent className="p-4">
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
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};
