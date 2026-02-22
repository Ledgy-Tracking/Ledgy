/**
 * Computation Service
 * Manages web worker pool for compute nodes
 * Story 4-3: Correlation & Compute Nodes
 */

type ComputeType = 'correlation' | 'arithmetic';
type ArithmeticOperation = 'sum' | 'average' | 'min' | 'max';

interface ComputeRequest {
  id: string;
  type: ComputeType;
  data: {
    x?: number[];
    y?: number[];
    values?: number[];
  };
  operation?: ArithmeticOperation;
}

interface ComputeResponse {
  id: string;
  result: number | null;
  error?: string;
}

type ComputeCallback = (response: ComputeResponse) => void;

class ComputationService {
  private worker: Worker | null = null;
  private callbacks: Map<string, ComputeCallback> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the computation worker
   */
  init() {
    if (this.initialized) return;

    try {
      // Use Vite's worker import
      this.worker = new Worker(
        new URL('./computation.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent<ComputeResponse>) => {
        const { id, result, error } = e.data;
        const callback = this.callbacks.get(id);
        if (callback) {
          callback({ id, result, error });
          this.callbacks.delete(id);
        }
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        // Notify all pending callbacks of the error
        this.callbacks.forEach((callback, id) => {
          callback({
            id,
            result: null,
            error: 'Computation failed',
          });
        });
        this.callbacks.clear();
      };

      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize computation worker:', err);
      this.initialized = false;
    }
  }

  /**
   * Compute correlation between two numeric arrays
   */
  computeCorrelation(x: number[], y: number[], callback: ComputeCallback): string {
    const id = `corr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.queueCompute({ id, type: 'correlation', data: { x, y } }, callback);
    return id;
  }

  /**
   * Compute arithmetic operation on values
   */
  computeArithmetic(
    values: number[],
    operation: ArithmeticOperation,
    callback: ComputeCallback
  ): string {
    const id = `arith-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.queueCompute({ id, type: 'arithmetic', data: { values }, operation }, callback);
    return id;
  }

  /**
   * Queue a compute request
   */
  private queueCompute(request: ComputeRequest, callback: ComputeCallback) {
    if (!this.initialized) {
      this.init();
    }

    this.callbacks.set(request.id, callback);

    if (this.worker) {
      this.worker.postMessage(request);
    } else {
      // Fallback: compute synchronously (shouldn't happen)
      console.warn('Worker not available, computation skipped');
      callback({
        id: request.id,
        result: null,
        error: 'Computation worker not available',
      });
      this.callbacks.delete(request.id);
    }
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.initialized = false;
      this.callbacks.clear();
    }
  }
}

export const computationService = new ComputationService();
