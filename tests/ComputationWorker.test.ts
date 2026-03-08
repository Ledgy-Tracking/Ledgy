import { describe, it, expect } from 'vitest';
import { pearsonCorrelation, arithmetic } from '../src/workers/computation.worker';

describe('Computation Worker Functions', () => {
    describe('pearsonCorrelation', () => {
        it('calculates perfect positive correlation', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [2, 4, 6, 8, 10];
            expect(pearsonCorrelation(x, y)).toBeCloseTo(1);
        });

        it('calculates perfect negative correlation', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [5, 4, 3, 2, 1];
            expect(pearsonCorrelation(x, y)).toBeCloseTo(-1);
        });

        it('calculates zero correlation', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [1, 5, 1, 5, 1];
            expect(pearsonCorrelation(x, y)).toBeCloseTo(0);
        });

        it('returns NaN for insufficient data', () => {
            expect(pearsonCorrelation([1], [1])).toBeNaN();
            expect(pearsonCorrelation([], [])).toBeNaN();
        });

        it('returns NaN for constant values', () => {
            const x = [1, 1, 1];
            const y = [2, 2, 2];
            expect(pearsonCorrelation(x, y)).toBeNaN();
        });
    });

    describe('arithmetic', () => {
        const values = [10, 20, 30, 40];

        it('calculates sum correctly', () => {
            expect(arithmetic(values, 'sum')).toBe(100);
        });

        it('calculates average correctly', () => {
            expect(arithmetic(values, 'average')).toBe(25);
        });

        it('calculates min correctly', () => {
            expect(arithmetic(values, 'min')).toBe(10);
        });

        it('calculates max correctly', () => {
            expect(arithmetic(values, 'max')).toBe(40);
        });

        it('returns NaN for empty data', () => {
            expect(arithmetic([], 'sum')).toBeNaN();
        });
    });
});
