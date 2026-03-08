import { create } from 'zustand';

export type ErrorType = 'error' | 'warning' | 'info';

export interface AppError {
    message: string;
    type: ErrorType;
    timestamp: number;
}

interface ErrorState {
    error: AppError | null;
    dispatchError: (message: string, type?: ErrorType) => void;
    clearError: (timestamp?: number) => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
    error: null,

    dispatchError: (message, type = 'error') => {
        set({
            error: {
                message,
                type,
                timestamp: Date.now(),
            },
        });
    },

    clearError: (timestamp) => {
        set((state) => {
            if (timestamp && state.error?.timestamp !== timestamp) {
                return state;
            }
            return { error: null };
        });
    },
}));
