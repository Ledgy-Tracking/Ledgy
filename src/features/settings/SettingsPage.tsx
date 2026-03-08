import { useUIStore } from '../../stores/useUIStore';
import { Sun, Moon, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

export const SettingsPage = () => {
    const { theme, density, setTheme, setDensity, resetToDefaults } = useUIStore();

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                Settings
            </h1>

            {/* Appearance Section */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Maximize2 className="w-5 h-5" />
                    Appearance
                </h2>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Theme Setting */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                {theme === 'dark' ? (
                                    <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                ) : (
                                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">Theme</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Choose between light and dark mode
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTheme('light')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    theme === 'light'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                Light
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    theme === 'dark'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                Dark
                            </button>
                        </div>
                    </div>

                    {/* Density Setting */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                {density === 'compact' ? (
                                    <Minimize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                ) : (
                                    <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">Density</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Control the spacing and size of UI elements
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setDensity('comfortable')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    density === 'comfortable'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                Comfortable
                            </button>
                            <button
                                onClick={() => setDensity('compact')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    density === 'compact'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                Compact
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reset Section */}
            <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Reset Settings
                </h2>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
                        Reset all settings to their default values. This action cannot be undone.
                    </p>
                    <button
                        onClick={resetToDefaults}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Defaults
                    </button>
                </div>
            </section>

            {/* Future Settings Placeholder */}
            <section className="mt-8 opacity-50">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Coming Soon
                </h2>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Additional settings will be available in future updates:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                            Language & Locale
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                            Notification Preferences
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                            Keyboard Shortcuts
                        </li>
                    </ul>
                </div>
            </section>
        </div>
    );
};
