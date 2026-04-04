import React from 'react';
import { useParams } from 'react-router-dom';
import { DashboardView } from './DashboardView';

export const Dashboard: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden">
            <div className="flex-1 overflow-hidden">
                <DashboardView dashboardId={projectId || 'default'} />
            </div>
        </div>
    );
};
