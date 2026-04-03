/**
 * Computation Web Worker
 * Story 4-3: Correlation & Compute Nodes
 * 
 * Handles heavy computation off the main thread
 */

interface ComputeRequest {
  id: string;
  type: 'correlation' | 'arithmetic';
  data: {
    x?: number[];
    y?: number[];
    values?: number[];
  };
  operation?: 'sum' | 'average' | 'min' | 'max';
}

interface ComputeResponse {
  id: string;
  result: number | null;
  error?: string;
  chartData?: { label: string; value: number }[];
  trend?: 'up' | 'down' | 'neutral';
  changePercent?: number;
}

/**
 * Calculate Pearson correlation coefficient
 * Returns value between -1 and 1, or NaN for insufficient data
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (!x || !y || x.length === 0 || y.length === 0) {
    return NaN;
  }

  const n = Math.min(x.length, y.length);
  if (n < 2) {
    return NaN;
  }

  // Use only the overlapping data
  // Optimization: Consolidate multiple O(N) array slicing and reduce loops into a single pass.
  // This minimizes heap allocation overhead and reduces complexity from O(7N) to O(N).
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

  if (denominator === 0) {
    return NaN; // Constant values
  }

  return numerator / denominator;
}

/**
 * Arithmetic operations
 */
export function arithmetic(values: number[], operation: string): number {
  if (!values || values.length === 0) {
    return NaN;
  }

  // Optimization: Replacing Array.reduce and Math.min/max with single-pass loops
  // Math.min(...values) triggers "Maximum call stack size exceeded" for large arrays.
  switch (operation) {
    case 'sum': {
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += values[i];
      }
      return sum;
    }
    case 'average': {
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += values[i];
      }
      return sum / values.length;
    }
    case 'min': {
      let min = Infinity;
      for (let i = 0; i < values.length; i++) {
        const val = values[i];
        if (Number.isNaN(val)) return NaN;
        if (val < min) min = val;
      }
      return min;
    }
    case 'max': {
      let max = -Infinity;
      for (let i = 0; i < values.length; i++) {
        const val = values[i];
        if (Number.isNaN(val)) return NaN;
        if (val > max) max = val;
      }
      return max;
    }
    default:
      return NaN;
  }
}

self.onmessage = function(e: MessageEvent<ComputeRequest>) {
  const { id, type, data, operation } = e.data;
  let result: number | null = null;
  let error: string | undefined;
  let chartData: { label: string; value: number }[] | undefined;
  let trend: 'up' | 'down' | 'neutral' | undefined;
  let changePercent: number | undefined;

  try {
    switch (type) {
      case 'correlation':
        if (!data.x || !data.y) {
          throw new Error('Both x and y data arrays are required');
        }
        result = pearsonCorrelation(data.x, data.y);
        if (isNaN(result)) {
          error = 'Insufficient data or constant values';
          result = null;
        } else {
            // Generate scatter plot like data or paired data
            chartData = data.x.slice(0, Math.min(data.x.length, data.y.length)).map((vx, i) => ({
                label: `Point ${i + 1}`,
                value: vx * (data.y![i] || 0) // Just a visual representation
            }));
            trend = result > 0.5 ? 'up' : result < -0.5 ? 'down' : 'neutral';
        }
        break;

      case 'arithmetic':
        if (!data.values) {
          throw new Error('Values array is required');
        }
        result = arithmetic(data.values, operation || 'average');
        if (isNaN(result)) {
          error = 'Invalid or empty data';
          result = null;
        } else {
            chartData = data.values.map((v, i) => ({
                label: `V${i + 1}`,
                value: v
            }));
            
            if (data.values.length > 1) {
                const first = data.values[0];
                const last = data.values[data.values.length - 1];
                if (first !== 0) {
                    changePercent = ((last - first) / Math.abs(first)) * 100;
                    trend = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral';
                }
            }
        }
        break;

      default:
        throw new Error(`Unknown computation type: ${type}`);
    }
  } catch (err: any) {
    error = err.message;
    result = null;
  }

  const response: ComputeResponse = {
    id,
    result,
    error,
    chartData,
    trend,
    changePercent
  };

  self.postMessage(response);
};

export {};
