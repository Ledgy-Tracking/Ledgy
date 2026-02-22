import React, { useEffect, useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { Outlet, useParams, Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, MonitorOff } from 'lucide-react';
import { useErrorStore } from '../../stores/useErrorStore';

export const AppShell: React.FC = () => {
    const {
        leftSidebarOpen, toggleLeftSidebar,
        rightInspectorOpen, toggleRightInspector,
        theme
    } = useUIStore();

    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
    const [mounted, setMounted] = useState(false);
    const { profileId } = useParams();
    const prevWidthRef = React.useRef(window.innerWidth);
    const { dispatchError } = useErrorStore();

    useEffect(() => {
        setMounted(true);
        const width = window.innerWidth;
        if (width < 900) {
            dispatchError("Mobile and Tablet layouts are not supported in this version.", "warning");
        }
        if (width < 1280) {
            useUIStore.getState().setRightInspector(false);
        }
        if (width < 1100) {
            useUIStore.getState().setLeftSidebar(false);
        }
    }, [dispatchError]);

    useEffect(() => {
        let timeoutId: number;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                const width = window.innerWidth;
                const prevWidth = prevWidthRef.current;
                setIsMobile(width < 900);
                if (prevWidth >= 1280 && width < 1280) {
                    useUIStore.getState().setRightInspector(false);
                }
                if (prevWidth >= 1100 && width < 1100) {
                    useUIStore.getState().setRightInspector(false);
                    useUIStore.getState().setLeftSidebar(false);
                }
                prevWidthRef.current = width;
            }, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    if (!mounted) return null;

    return (
        <div className="relative flex h-screen w-full bg-[#0d0d0f] text-zinc-50 font-sans overflow-hidden">
            {isMobile && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm p-6 text-center">
                    <div className="max-w-xs space-y-4">
                        <MonitorOff size={48} className="mx-auto text-emerald-500" />
                        <h1 className="text-xl font-bold italic tracking-tight">Ledgy Desktop</h1>
                        <p className="text-zinc-400 text-sm">
                            Mobile and Tablet layouts are not supported in this version.
                        </p>
                    </div>
                </div>
            )}

            {/* Left Sidebar */}
            <aside
                className={`flex flex-col bg-zinc-900 border-r border-zinc-800 transition-[width] duration-300 ease-in-out shrink-0 overflow-hidden ${leftSidebarOpen ? 'w-[220px]' : 'w-[48px]'}`}
            >
                <div className="px-4 pt-3.5 pb-2.5 border-b border-zinc-800 shrink-0 flex items-center">
                    {leftSidebarOpen ? (
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-semibold flex items-center gap-2">
                                🌿 Ledgy
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                                Personal · {profileId || 'James'}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex justify-center">🌿</div>
                    )}
                    <button onClick={toggleLeftSidebar} className="text-zinc-400 hover:text-zinc-200 ml-1">
                        {leftSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto overflow-x-hidden py-2 custom-scrollbar">
                    {leftSidebarOpen && (
                        <>
                            <div className="px-2 pb-1">
                                <div className="text-[10px] font-semibold tracking-wider uppercase text-zinc-600 px-2 mb-0.5 mt-2">Projects</div>
                                <SidebarItem label="Wellness" active badge="12" />
                                <SidebarItem label="Finances" badge="34" />
                                <SidebarItem label="Car Maintenance" badge="8" />
                                <div className="text-[12px] text-zinc-600 px-4 py-1.5 cursor-pointer hover:text-zinc-400 transition-colors">+ New Project</div>
                            </div>
                            <div className="px-2 mt-4 pb-1">
                                <div className="text-[10px] font-semibold tracking-wider uppercase text-zinc-600 px-2 mb-0.5">Ledgers</div>
                                <SidebarItem label="Caffeine Log" active />
                                <SidebarItem label="Sleep Tracker" />
                                <SidebarItem label="Workouts" />
                                <div className="text-[12px] text-zinc-600 px-4 py-1.5 cursor-pointer hover:text-zinc-400 transition-colors">+ New Ledger</div>
                            </div>
                        </>
                    )}
                </div>

                {leftSidebarOpen && (
                    <div className="mt-auto px-4 py-3 border-t border-zinc-800 text-[11px] text-emerald-500 flex items-center gap-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Synced · 2s ago
                    </div>
                )}
            </aside>

            {/* Main Canvas */}
            <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden relative">
                <Outlet context={{ profileId }} />
            </main>

            {/* Right Inspector */}
            <aside
                className={`flex flex-col bg-zinc-900 border-l border-zinc-800 transition-[width] duration-300 ease-in-out shrink-0 overflow-hidden ${rightInspectorOpen ? 'w-[260px]' : 'w-0'}`}
            >
                <div className="h-12 flex items-center px-3.5 border-b border-zinc-800 shrink-0 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <button onClick={toggleRightInspector} className="mr-2 text-zinc-400 hover:text-zinc-200">
                        <PanelRightClose size={16} />
                    </button>
                    {rightInspectorOpen && "Entry Details"}
                </div>
                {rightInspectorOpen && (
                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                        <InspectorField label="Item" value="Flat White" />
                        <InspectorField label="Amount" value="160 mg" />
                        <InspectorField label="Time" value="08:34 · 2026-02-21" />
                        <InspectorField label="Mood" value={<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400">Good</span>} />
                        <InspectorField label="Linked Entry" value={<span className="text-emerald-400 text-[12px]">Sleep #47 → 7h 20m deep sleep</span>} />
                        <InspectorField label="Entry ID" value={<span className="font-mono text-[12px] text-zinc-400">caf_fb3a9d</span>} />
                    </div>
                )}
            </aside>
        </div>
    );
};

const SidebarItem = ({ label, active, badge }: { label: string, active?: boolean, badge?: string }) => (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded text-[13px] cursor-pointer transition-colors ${active ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50'}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
        <span className="truncate flex-1">{label}</span>
        {badge && (
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 rounded-full ml-auto">{badge}</span>
        )}
    </div>
);

const InspectorField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="px-3.5 py-2.5 border-b border-zinc-800">
        <div className="text-[11px] text-zinc-400 mb-1">{label}</div>
        <div className="text-[13px] text-zinc-50">{value}</div>
    </div>
);
