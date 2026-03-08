import React from 'react';
import { useNotificationStore, Notification } from '../stores/useNotificationStore';
import { Info, CheckCircle, AlertTriangle, X } from 'lucide-react';

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

    const bgColor = notification.type === 'success' ? 'bg-emerald-900/90' :
        notification.type === 'warning' ? 'bg-amber-900/90' : 'bg-blue-900/90';

    const borderColor = notification.type === 'success' ? 'border-emerald-500' :
        notification.type === 'warning' ? 'border-amber-500' : 'border-blue-500';

    const textColor = notification.type === 'success' ? 'text-emerald-200' :
        notification.type === 'warning' ? 'text-amber-200' : 'text-blue-200';

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl backdrop-blur-md animate-in slide-in-from-left-4 duration-300 ${bgColor} ${borderColor} ${textColor} min-w-[300px] max-w-md`}>
            <div className="shrink-0">
                <Icon size={20} />
            </div>
            <div className="flex-grow text-sm font-medium">
                {notification.message}
            </div>
            <button
                onClick={() => onRemove(notification.id)}
                className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Close"
            >
                <X size={16} />
            </button>
        </div>
    );
};
