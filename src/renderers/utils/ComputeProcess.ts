import {ComputeStep} from './ComputeStep.js';

class ComputeProcess {
  readonly steps: ComputeStep[];

  constructor(processes: (ComputeStep | ComputeProcess)[]) {
    this.steps = [];

    processes.forEach(process => {
      if (process instanceof ComputeProcess) {
        this.steps.push(...process.steps);
      } else {
        this.steps.push(process);
      }
    });
  }

  run(encoder: GPUCommandEncoder, bindGroups: GPUBindGroup[][]) {
    this.steps.forEach((step, i) => {
      step.run(encoder, bindGroups[i]);
    });
  }

  runWithSharedBindGroups(
    encoder: GPUCommandEncoder,
    bindGroups: GPUBindGroup[]
  ) {
    this.steps.forEach(step => {
      step.run(encoder, bindGroups);
    });
  }
}

export {ComputeProcess};
