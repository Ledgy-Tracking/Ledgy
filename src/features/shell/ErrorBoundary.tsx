import { Component, ErrorInfo, ReactNode } from 'react';
import { useErrorStore } from '../../stores/useErrorStore';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

        // Security: Avoid leaking componentStack in user-visible error messages
        dispatchError(
            `An unexpected error occurred: ${error.message}`,
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
                    <Card className="bg-red-950/90 border-red-500 text-red-200 max-w-md shadow-2xl">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="shrink-0 mt-0.5" size={24} />
                                <div className="flex-grow">
                                    <h3 className="font-semibold mb-2">Something went wrong</h3>
                                    <p className="text-sm opacity-90 mb-4">{error.message}</p>
                                    <Button
                                        onClick={this.handleDismiss}
                                        className="text-xs bg-red-800 hover:bg-red-700 px-3 py-1.5 rounded transition-colors"
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return children;
    }
}
