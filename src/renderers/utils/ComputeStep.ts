class ComputeStep {
  readonly device: GPUDevice;
  readonly bindGroupLayouts: GPUBindGroupLayout[];
  readonly pipeline: GPUComputePipeline;
  workgroupCount: {x: number; y?: number; z?: number};

  constructor(
    label: string,
    device: GPUDevice,
    bindGroupLayoutDescriptors: Iterable<GPUBindGroupLayoutDescriptor>,
    code: string,
    entryPoint: string,
    workgroupCount: {x: number; y?: number; z?: number}
  ) {
    this.device = device;

    this.bindGroupLayouts = [];

    for (const descriptor of bindGroupLayoutDescriptors) {
      this.bindGroupLayouts.push(device.createBindGroupLayout(descriptor));
    }

    const layout = device.createPipelineLayout({
      label: `${label} pipeline layout`,
      bindGroupLayouts: this.bindGroupLayouts,
    });

    this.pipeline = this.device.createComputePipeline({
      label,
      layout,
      compute: {
        module: device.createShaderModule({
          label: `${label} shader module`,
          code,
        }),
        entryPoint,
      },
    });

    this.workgroupCount = workgroupCount;
  }

  run(encoder: GPUCommandEncoder, bindGroups: GPUBindGroup[]) {
    const pass = encoder.beginComputePass();

    pass.setPipeline(this.pipeline);

    bindGroups.forEach((bindGroup, index) => {
      pass.setBindGroup(index, bindGroup);
    });

    pass.dispatchWorkgroups(
      this.workgroupCount.x,
      this.workgroupCount.y,
      this.workgroupCount.z
    );

    pass.end();
  }
}

export {ComputeStep};
