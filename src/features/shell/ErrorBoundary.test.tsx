import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary, useErrorHandler } from './ErrorBoundary';
import { useErrorStore } from '../../stores/useErrorStore';
import { ErrorToast } from '../../components/ErrorToast';

// Test component that throws an error
const ThrowErrorComponent: React.FC<{ message?: string }> = ({ message = 'Test error' }) => {
    throw new Error(message);
};

// Test component that renders successfully
const SuccessComponent: React.FC = () => <div data-testid="success">Success</div>;

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // Clear error store before each test
        useErrorStore.getState().clearError();
    });

    it('renders children when no error occurs', () => {
        render(
            <ErrorBoundary>
                <SuccessComponent />
            </ErrorBoundary>
        );

        expect(screen.getByTestId('success')).toBeInTheDocument();
    });

    it('catches and displays error when child component throws', () => {
        // Suppress console.error for this test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ErrorBoundary>
                <ThrowErrorComponent message="Test error message" />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Test error message')).toBeInTheDocument();

        consoleSpy.mockRestore();
    });

    it('dispatches error to useErrorStore when error is caught', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const dispatchErrorSpy = vi.spyOn(useErrorStore.getState(), 'dispatchError');

        render(
            <ErrorBoundary>
                <ThrowErrorComponent message="Store test error" />
            </ErrorBoundary>
        );

        expect(dispatchErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Store test error'),
            'error'
        );

        consoleSpy.mockRestore();
    });

    it('shows custom fallback when provided', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Fallback</div>}>
                <ThrowErrorComponent />
            </ErrorBoundary>
        );

        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();

        consoleSpy.mockRestore();
    });

    it('integrates with ErrorToast via useErrorHandler hook', async () => {
        // Test error flow via useErrorHandler: functional component → dispatchError → ErrorToast
        const ErrorThrowingComponent: React.FC = () => {
            const handleError = useErrorHandler();
            
            React.useEffect(() => {
                handleError(new Error('Integration test error'), 'useEffect Error');
            }, [handleError]);
            
            return <div data-testid="component">Component</div>;
        };

        render(
            <>
                <ErrorBoundary>
                    <ErrorThrowingComponent />
                </ErrorBoundary>
                <ErrorToast />
            </>
        );

        // Wait for error to be dispatched and toast to appear
        await waitFor(() => {
            const errorToast = screen.getByText('useEffect Error: Integration test error');
            expect(errorToast).toBeInTheDocument();
        }, { timeout: 1000 });
    });

    it('dispatches error that ErrorToast can display', async () => {
        // Test that ErrorBoundary properly dispatches to store for ErrorToast
        const dispatchErrorSpy = vi.spyOn(useErrorStore.getState(), 'dispatchError');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <>
                <ErrorBoundary>
                    <ThrowErrorComponent message="Toast display test" />
                </ErrorBoundary>
                <ErrorToast />
            </>
        );

        // Verify error was dispatched
        expect(dispatchErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Toast display test'),
            'error'
        );

        // Wait for ErrorToast to display the error from store
        await waitFor(() => {
            expect(screen.getByText('Toast display test')).toBeInTheDocument();
        }, { timeout: 1000 });

        consoleSpy.mockRestore();
    });
});

describe('useErrorHandler', () => {
    it('dispatches error to useErrorStore with context', () => {
        const { result } = renderHook(() => useErrorHandler());
        const dispatchErrorSpy = vi.spyOn(useErrorStore.getState(), 'dispatchError');

        const error = new Error('Hook test error');
        result.current(error, 'Test Context');

        expect(dispatchErrorSpy).toHaveBeenCalledWith(
            'Test Context: Hook test error',
            'error'
        );
    });

    it('dispatches error without context when not provided', () => {
        const { result } = renderHook(() => useErrorHandler());
        const dispatchErrorSpy = vi.spyOn(useErrorStore.getState(), 'dispatchError');

        const error = new Error('Simple error');
        result.current(error);

        expect(dispatchErrorSpy).toHaveBeenCalledWith('Simple error', 'error');
    });

    it('can be used in functional components for async error handling', async () => {
        const dispatchErrorSpy = vi.spyOn(useErrorStore.getState(), 'dispatchError');
        
        const TestComponent: React.FC = () => {
            const handleError = useErrorHandler();
            
            const handleAsyncError = async () => {
                try {
                    await Promise.reject(new Error('Async error'));
                } catch (error) {
                    handleError(error as Error, 'Async Operation');
                }
            };
            
            return <button onClick={handleAsyncError}>Trigger Error</button>;
        };

        render(<TestComponent />);
        
        const button = screen.getByText('Trigger Error');
        fireEvent.click(button);

        await waitFor(() => {
            expect(dispatchErrorSpy).toHaveBeenCalledWith(
                'Async Operation: Async error',
                'error'
            );
        });
    });
});

// Helper for testing hooks
function renderHook<T>(callback: () => T) {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div>{children}</div>
    );
    
    let resultValue: T;
    
    const TestComponent: React.FC = () => {
        resultValue = callback();
        return null;
    };
    
    render(<TestComponent />, { wrapper });
    
    return { result: { current: resultValue! } };
}
