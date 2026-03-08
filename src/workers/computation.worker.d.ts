declare module '*.worker.ts' {
  class ComputationWorker extends Worker {
    constructor();
  }

  export default ComputationWorker;
}
