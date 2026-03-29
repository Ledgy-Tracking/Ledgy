import { useUIStore } from '../../stores/useUIStore';
import { Menu, ChevronLeft, ChevronRight, FolderOpen, Database, GitGraph, LayoutDashboard, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavigationMenu } from '@/components/ui/navigation-menu';
import { useNavigate, useLocation } from 'react-router-dom';

export const Sidebar = () => {
    const sidebarOpen = useUIStore((state) => state.leftSidebarOpen);
    const toggleSidebar = useUIStore((state) => state.toggleLeftSidebar);
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { icon: FolderOpen, label: 'Projects', path: '/app/:profileId/projects' },
        { icon: Database, label: 'Ledger', path: '/app/:profileId/ledger' },
        { icon: GitGraph, label: 'Node Forge', path: '/app/:profileId/node-forge' },
        { icon: LayoutDashboard, label: 'Dashboard', path: '/app/:profileId/dashboard' },
        { icon: Settings, label: 'Settings', path: '/app/:profileId/settings' },
    ];

    const handleNavigate = (path: string) => {
        // Replace :profileId with actual profile ID from URL
        const currentPath = location.pathname;
        const profileIdMatch = currentPath.match(/\/app\/([^/]+)/);
        const profileId = profileIdMatch ? profileIdMatch[1] : 'default';
        const resolvedPath = path.replace(':profileId', profileId);
        navigate(resolvedPath);
    };

    return (
        <aside
            className={`
                flex flex-col border-r border-white/5
                bg-gray-50 dark:bg-zinc-900/50 backdrop-blur-xl
                transition-all duration-300 ease-in-out
                ${sidebarOpen ? 'w-64' : 'w-0'}
                ${!sidebarOpen && 'overflow-hidden'}
                md:relative absolute left-0 top-0 h-full z-20
            `}
        >
            {/* Sidebar Header */}
            <div className={`flex items-center justify-between p-4 border-b border-white/5 ${!sidebarOpen && 'hidden'}`}>
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold text-zinc-900 dark:text-white">Ledgy</span>
                </div>
                <Button
                    onClick={toggleSidebar}
                    variant="ghost"
                    size="icon-xs"
                    className="text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800/50"
                    aria-label="Collapse sidebar"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
            </div>

            {/* Mobile Hamburger Trigger */}
            {!sidebarOpen && (
                <Button
                    onClick={toggleSidebar}
                    variant="ghost"
                    size="icon"
                    className="md:hidden absolute left-2 top-2 bg-gray-100 dark:bg-zinc-800/50 hover:bg-zinc-700/50 z-30"
                    aria-label="Open sidebar"
                    aria-expanded="false"
                >
                    <Menu className="w-5 h-5 text-zinc-400" />
                </Button>
            )}

            {/* Navigation Menu */}
            <NavigationMenu viewport={false} className={`flex-1 overflow-y-auto p-4 ${!sidebarOpen && 'hidden'}`}>
                <ul className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.includes(item.label.toLowerCase());
                        
                        return (
                            <li key={item.label}>
                                <Button
                                    onClick={() => handleNavigate(item.path)}
                                    variant="ghost"
                                    className={`w-full justify-start ${isActive 
                                        ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' 
                                        : 'text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            </NavigationMenu>

            {/* Toggle Button (when collapsed on desktop) */}
            <div className={`hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 ${sidebarOpen && 'hidden'}`}>
                <Button
                    onClick={toggleSidebar}
                    variant="ghost"
                    size="icon-sm"
                    className="bg-gray-50 dark:bg-zinc-900 border border-white/10 shadow-md hover:bg-gray-200 dark:hover:bg-zinc-800/50"
                    aria-label="Expand sidebar"
                >
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                </Button>
            </div>
        </aside>
    );
};
