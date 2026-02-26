/**
 * Computation Service
 * Manages web worker pool for compute nodes
 * Story 4-3: Correlation & Compute Nodes
 */

import { ComputeType, ArithmeticOperation } from '../types/nodeEditor';

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
  chartData?: { label: string; value: number }[];
  trend?: 'up' | 'down' | 'neutral';
  changePercent?: number;
}

type ComputeCallback = (response: ComputeResponse) => void;

class ComputationService {
  private worker: Worker | null = null;
  private callbacks: Map<string, ComputeCallback> = new Map();
  private initializing: boolean = false;

  /**
   * Initialize the computation worker
   */
  init() {
    if (this.worker || this.initializing) return;
    this.initializing = true;

    try {
      // Use Vite's worker import
      this.worker = new Worker(
        new URL('../workers/computation.worker.ts', import.meta.url),
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
        this.failAllPending('Computation worker error');
      };

      this.initializing = false;
    } catch (err) {
      console.error('Failed to initialize computation worker:', err);
      this.initializing = false;
      this.failAllPending('Failed to initialize worker');
    }
  }

  private failAllPending(error: string) {
    this.callbacks.forEach((callback, id) => {
      callback({ id, result: null, error });
    });
    this.callbacks.clear();
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
    if (!this.worker && !this.initializing) {
      this.init();
    }

    this.callbacks.set(request.id, callback);

    if (this.worker) {
      this.worker.postMessage(request);
    } else if (!this.initializing) {
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
      this.initializing = false;
      this.callbacks.clear();
    }
  }
}

export const computationService = new ComputationService();
