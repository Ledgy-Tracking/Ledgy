import { useUIStore } from '../../stores/useUIStore';
import { Menu, ChevronLeft, ChevronRight, FolderOpen, Database, GitGraph, LayoutDashboard, Settings, Users } from 'lucide-react';
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
                flex flex-col border-r border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800
                transition-all duration-300 ease-in-out
                ${sidebarOpen ? 'w-64' : 'w-0'}
                ${!sidebarOpen && 'overflow-hidden'}
                md:relative absolute left-0 top-0 h-full z-20
            `}
        >
            {/* Sidebar Header */}
            <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${!sidebarOpen && 'hidden'}`}>
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="font-semibold text-gray-900 dark:text-white">Ledgy</span>
                </div>
                <button
                    onClick={toggleSidebar}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Collapse sidebar"
                >
                    <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            {/* Mobile Hamburger Trigger */}
            {!sidebarOpen && (
                <button
                    onClick={toggleSidebar}
                    className="md:hidden absolute left-2 top-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors z-30"
                    aria-label="Open sidebar"
                    aria-expanded="false"
                >
                    <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
            )}

            {/* Navigation Menu */}
            <nav className={`flex-1 overflow-y-auto p-4 ${!sidebarOpen && 'hidden'}`} role="navigation" aria-label="Main navigation">
                <ul className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.includes(item.label.toLowerCase());
                        
                        return (
                            <li key={item.label}>
                                <button
                                    onClick={() => handleNavigate(item.path)}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2 rounded-lg
                                        transition-colors
                                        ${isActive 
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Toggle Button (when collapsed on desktop) */}
            <div className={`hidden md:block absolute -right-3 top-1/2 ${sidebarOpen && 'hidden'}`}>
                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Expand sidebar"
                >
                    <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
            </div>
        </aside>
    );
};
