/**
 * Statistical calculation utilities for node computations
 * Story 4-6: Correlation and Arithmetic operations
 */

export interface CorrelationResult {
    r: number | null;
    error?: string;
    sampleSize: number;
}

export interface ArithmeticResult {
    value: number | null;
    error?: string;
}

/**
 * Calculate Pearson correlation coefficient
 * Formula: r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)
 */
export const calculatePearsonCorrelation = (
    x: number[],
    y: number[]
): CorrelationResult => {
    // Validation
    if (x.length === 0 || y.length === 0) {
        return { r: null, error: 'Insufficient data', sampleSize: 0 };
    }
    if (x.length !== y.length) {
        return { r: null, error: 'Array length mismatch', sampleSize: Math.min(x.length, y.length) };
    }
    if (x.length < 2) {
        return { r: null, error: 'Need 2+ data points', sampleSize: x.length };
    }

    // Calculate means
    const xMean = x.reduce((a, b) => a + b, 0) / x.length;
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;

    // Calculate Pearson's r
    let numerator = 0;
    let xDenom = 0;
    let yDenom = 0;

    for (let i = 0; i < x.length; i++) {
        const xDiff = x[i] - xMean;
        const yDiff = y[i] - yMean;
        numerator += xDiff * yDiff;
        xDenom += xDiff * xDiff;
        yDenom += yDiff * yDiff;
    }

    // Check for zero variance
    if (xDenom === 0 || yDenom === 0) {
        return { r: null, error: 'No variance in data', sampleSize: x.length };
    }

    const r = numerator / Math.sqrt(xDenom * yDenom);
    return { r: Math.max(-1, Math.min(1, r)), sampleSize: x.length }; // Clamp to [-1, 1]
};

/**
 * Arithmetic operations
 */
export type ArithmeticOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'sum' | 'average' | 'min' | 'max';

/**
 * Perform arithmetic operation on array of numbers
 */
export const calculateArithmetic = (
    values: number[],
    operation: ArithmeticOperation
): ArithmeticResult => {
    if (values.length === 0) {
        return { value: null, error: 'No inputs provided' };
    }

    switch (operation) {
        case 'add':
        case 'sum':
            return { value: values.reduce((a, b) => a + b, 0) };

        case 'subtract':
            if (values.length < 2) {
                return { value: null, error: 'Need 2+ values for subtraction' };
            }
            return { value: values.reduce((a, b) => a - b) };

        case 'multiply':
            return { value: values.reduce((a, b) => a * b, 1) };

        case 'divide':
            if (values.length < 2) {
                return { value: null, error: 'Need 2 values for division' };
            }
            if (values[1] === 0) {
                return { value: null, error: 'Division by zero' };
            }
            return { value: values[0] / values[1] };

        case 'average':
            return { value: values.reduce((a, b) => a + b, 0) / values.length };

        case 'min':
            return { value: Math.min(...values) };

        case 'max':
            return { value: Math.max(...values) };

        default:
            return { value: null, error: 'Unknown operation' };
    }
};

/**
 * Get correlation color based on value
 */
export const getCorrelationColor = (value: number | null | undefined): string => {
    if (typeof value !== 'number') return 'text-zinc-500';
    if (value >= 0.7) return 'text-emerald-400';
    if (value >= 0.3) return 'text-amber-400';
    if (value >= -0.3) return 'text-zinc-400';
    if (value >= -0.7) return 'text-amber-400';
    return 'text-red-400';
};

/**
 * Get correlation label based on value
 */
export const getCorrelationLabel = (value: number | null | undefined): string => {
    if (typeof value !== 'number') return '-';
    if (value >= 0.7) return 'Strong +';
    if (value >= 0.3) return 'Moderate +';
    if (value >= -0.3) return 'Weak';
    if (value >= -0.7) return 'Moderate -';
    return 'Strong -';
};
