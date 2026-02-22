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
}

/**
 * Calculate Pearson correlation coefficient
 * Returns value between -1 and 1, or NaN for insufficient data
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  if (!x || !y || x.length === 0 || y.length === 0) {
    return NaN;
  }

  const n = Math.min(x.length, y.length);
  if (n < 2) {
    return NaN;
  }

  // Use only the overlapping data
  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((a, b) => a + b, 0);
  const sumY = ySlice.reduce((a, b) => a + b, 0);
  const sumXY = xSlice.reduce((sum, xi, i) => sum + xi * ySlice[i], 0);
  const sumX2 = xSlice.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = ySlice.reduce((sum, yi) => sum + yi * yi, 0);

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
function arithmetic(values: number[], operation: string): number {
  if (!values || values.length === 0) {
    return NaN;
  }

  switch (operation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'average':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return NaN;
  }
}

self.onmessage = function(e: MessageEvent<ComputeRequest>) {
  const { id, type, data, operation } = e.data;
  let result: number | null = null;
  let error: string | undefined;

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
  };

  self.postMessage(response);
};

export {};
