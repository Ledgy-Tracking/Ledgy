import { Component, ErrorInfo, ReactNode } from 'react';
import { useErrorStore } from '../../stores/useErrorStore';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// Hook-based error dispatcher for functional components
export const useErrorHandler = () => {
    const dispatchError = useErrorStore((state) => state.dispatchError);

    const handleError = (error: Error, context?: string) => {
        const message = context ? `${context}: ${error.message}` : error.message;
        dispatchError(message, 'error');
    };

    return handleError;
};

// Class-based error boundary for catching render errors
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Dispatch error to global error store
        const dispatchError = useErrorStore.getState().dispatchError;
        dispatchError(
            `ErrorBoundary caught: ${error.message}${errorInfo.componentStack ? ` in ${errorInfo.componentStack}` : ''}`,
            'error'
        );

        // Log error for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleDismiss = () => {
        this.setState({
            hasError: false,
            error: null,
        });
    };

    render(): ReactNode {
        const { hasError, error } = this.state;
        const { children, fallback } = this.props;

        if (hasError && error) {
            if (fallback) {
                return fallback;
            }

            return (
                <div className="flex items-center justify-center min-h-[200px] p-6">
                    <div className="bg-red-950/90 border border-red-500 text-red-200 rounded-lg p-6 max-w-md shadow-2xl">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="shrink-0 mt-0.5" size={24} />
                            <div className="flex-grow">
                                <h3 className="font-semibold mb-2">Something went wrong</h3>
                                <p className="text-sm opacity-90 mb-4">{error.message}</p>
                                <button
                                    onClick={this.handleDismiss}
                                    className="text-xs bg-red-800 hover:bg-red-700 px-3 py-1.5 rounded transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return children;
    }
}
