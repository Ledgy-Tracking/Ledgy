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

    const n = x.length;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
        const xi = x[i];
        const yi = y[i];

        sumX += xi;
        sumY += yi;
        sumXY += xi * yi;
        sumX2 += xi * xi;
        sumY2 += yi * yi;
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    // Check for zero variance
    if (denominator === 0) {
        return { r: null, error: 'No variance in data', sampleSize: n };
    }

    const r = numerator / denominator;
    return { r: Math.max(-1, Math.min(1, r)), sampleSize: n }; // Clamp to [-1, 1]
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
        case 'sum': {
            let sum = 0;
            for (let i = 0; i < values.length; i++) sum += values[i];
            return { value: sum };
        }

        case 'subtract': {
            if (values.length < 2) {
                return { value: null, error: 'Need 2+ values for subtraction' };
            }
            let sub = values[0];
            for (let i = 1; i < values.length; i++) sub -= values[i];
            return { value: sub };
        }

        case 'multiply': {
            let mult = 1;
            for (let i = 0; i < values.length; i++) mult *= values[i];
            return { value: mult };
        }

        case 'divide':
            if (values.length < 2) {
                return { value: null, error: 'Need 2 values for division' };
            }
            if (values[1] === 0) {
                return { value: null, error: 'Division by zero' };
            }
            return { value: values[0] / values[1] };

        case 'average': {
            let sumAvg = 0;
            for (let i = 0; i < values.length; i++) sumAvg += values[i];
            return { value: sumAvg / values.length };
        }

        case 'min': {
            let min = Infinity;
            for (let i = 0; i < values.length; i++) {
                if (Number.isNaN(values[i])) return { value: NaN };
                if (values[i] < min) min = values[i];
            }
            return { value: min };
        }

        case 'max': {
            let max = -Infinity;
            for (let i = 0; i < values.length; i++) {
                if (Number.isNaN(values[i])) return { value: NaN };
                if (values[i] > max) max = values[i];
            }
            return { value: max };
        }

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
