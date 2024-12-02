import {BindGroup} from './BindGroup.js';

enum ComputeFor {
  EveryPixel,
  Every512Triangle,
}

type ComputePipelineOptions = {
  label?: string;
  bindGroups: BindGroup[];
  code: string;
  entryPoint: string;
  workgroupSize: {x: number; y?: number; z?: number};
  frequency: ComputeFor;
};

class ComputePipeline {
  options: ComputePipelineOptions;
  device?: GPUDevice;
  gpuObject?: GPUComputePipeline;

  constructor(options: ComputePipelineOptions) {
    this.options = options;
  }

  build(device: GPUDevice) {
    const bindGroupLayouts = this.options.bindGroups.map(bindGroup => {
      if (!bindGroup.layout) bindGroup.buildLayout(device);
      return bindGroup.layout!;
    });

    let wgslDeclarations = '';

    this.options.bindGroups.forEach((bindGroup, groupIndex) => {
      wgslDeclarations += bindGroup.wgsl(groupIndex);
    });

    this.gpuObject = device.createComputePipeline({
      label: this.options.label,
      layout: device.createPipelineLayout({
        label: `${this.options.label} layout`,
        bindGroupLayouts,
      }),
      compute: {
        module: device.createShaderModule({
          label: `${this.options.label} shader module`,
          code: wgslDeclarations + this.options.code,
        }),
        entryPoint: this.options.entryPoint,
      },
    });

    this.device = device;
  }

  run(
    encoder: GPUCommandEncoder,
    workItemCount: {x: number; y?: number; z?: number}
  ) {
    if (!this.gpuObject) {
      throw new Error('GPU object has not been built. Run .build() first.');
    }

    const pass = encoder.beginComputePass({
      label: this.options.label
        ? `${this.options.label} compute pass`
        : undefined,
    });
    pass.setPipeline(this.gpuObject);

    this.options.bindGroups.forEach((bindGroup, index) => {
      if (!bindGroup.gpuObject) bindGroup.build(this.device!);
      pass.setBindGroup(index, bindGroup.gpuObject!);
    });

    const workgroupCountX = Math.ceil(
      workItemCount.x / this.options.workgroupSize.x
    );
    const workgroupCountY = Math.ceil(
      (workItemCount.y ?? 1) / (this.options.workgroupSize.y ?? 1)
    );
    const workgroupCountZ = Math.ceil(
      (workItemCount.z ?? 1) / (this.options.workgroupSize.z ?? 1)
    );

    pass.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);

    pass.end();
  }
}

export {ComputePipeline, ComputeFor};
