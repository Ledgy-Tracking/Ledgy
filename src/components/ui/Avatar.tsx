import React from 'react';
import { cn } from '../../lib/utils';
import { User } from 'lucide-react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    /** 
     * Background color class (e.g. 'bg-emerald-500').
     */
    color?: string;

    /**
     * Text initials for text fallback. Up to 2 characters optimal.
     */
    initials?: string;

    /**
     * Icon to display if initials aren't present.
     */
    icon?: React.ReactNode;

    /**
     * Size variant.
     */
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';

    /**
     * Optional image url.
     */
    src?: string;
}

const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
    '2xl': 'h-24 w-24 text-2xl',
};

const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
    '2xl': 'h-10 w-10',
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, color = 'bg-zinc-700', initials, icon, size = 'md', src, ...props }, ref) => {
        const [imgError, setImgError] = React.useState(false);

        return (
            <div
                ref={ref}
                className={cn(
                    'relative flex shrink-0 items-center justify-center rounded-full text-white font-medium overflow-hidden shadow-sm selection:bg-transparent',
                    sizeClasses[size],
                    !src || imgError ? color : 'bg-zinc-800',
                    className
                )}
                {...props}
            >
                {src && !imgError ? (
                    <img
                        src={src}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : initials ? (
                    <span className="select-none tracking-wider">{initials.substring(0, 2).toUpperCase()}</span>
                ) : icon ? (
                    icon
                ) : (
                    <User className={cn("opacity-70", iconSizeClasses[size])} />
                )}
            </div>
        );
    }
);
Avatar.displayName = 'Avatar';
