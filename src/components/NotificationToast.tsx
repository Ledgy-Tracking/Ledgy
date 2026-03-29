import React from 'react';
import { useNotificationStore, Notification } from '../stores/useNotificationStore';
import { Info, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const NotificationToast: React.FC = () => {
    const { notifications, removeNotification } = useNotificationStore();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
            {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRemove={removeNotification} />
            ))}
        </div>
    );
};

const NotificationItem: React.FC<{ notification: Notification; onRemove: (id: string) => void }> = ({ notification, onRemove }) => {
    const Icon = notification.type === 'success' ? CheckCircle :
        notification.type === 'warning' ? AlertTriangle : Info;

    return (
        <Alert className={cn(
            "shadow-xl backdrop-blur-md animate-in slide-in-from-left-4 duration-300 min-w-[300px] max-w-md",
            notification.type === 'success' 
                ? 'bg-emerald-900/90 border-emerald-500 text-emerald-200'
                : notification.type === 'warning'
                ? 'bg-amber-900/90 border-amber-500 text-amber-200'
                : 'bg-blue-900/90 border-blue-500 text-blue-200'
        )}>
            <Icon className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between pr-2">
                <span className="text-sm font-medium">{notification.message}</span>
                <Button
                    onClick={() => onRemove(notification.id)}
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-white/10 ml-2"
                    aria-label="Close"
                >
                    <X size={16} />
                </Button>
            </AlertDescription>
        </Alert>
    );
};
