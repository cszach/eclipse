import {Buffer} from './Buffer.js';

type BindGroupOptions = {
  label?: string;
};

class BindGroup {
  options: BindGroupOptions;
  entries: {
    buffer: Buffer;
    visibility: number;
    isReadOnly: boolean;
  }[];
  layout?: GPUBindGroupLayout;
  device?: GPUDevice;
  gpuObject?: GPUBindGroup;

  constructor(options: BindGroupOptions = {}) {
    this.options = options;
    this.entries = [];
  }

  addBuffer(buffer: Buffer, visibility: number, isReadOnly: boolean) {
    this.entries.push({buffer, visibility, isReadOnly});
  }

  buildLayout(device: GPUDevice) {
    const entries = this.entries.map((entry, binding) => {
      let type: GPUBufferBindingType = entry.isReadOnly
        ? 'read-only-storage'
        : 'storage';
      if (entry.buffer.isUniform) type = 'uniform';

      return {
        binding,
        visibility: entry.visibility,
        buffer: {type},
      };
    });

    this.layout = device.createBindGroupLayout({
      label: this.options.label ? `${this.options.label} layout` : undefined,
      entries,
    });
  }

  build(device: GPUDevice) {
    if (!this.layout) this.buildLayout(device);

    const entries: GPUBindGroupEntry[] = this.entries.map((entry, binding) => {
      if (!entry.buffer.gpuObject) entry.buffer.build(device);

      return {
        binding,
        resource: {buffer: entry.buffer.gpuObject!},
      };
    });

    this.gpuObject = device.createBindGroup({
      label: this.options.label,
      layout: this.layout!,
      entries,
    });
    this.device = device;
  }

  wgsl(group: number): string {
    let wgsl = '';

    this.entries.forEach((entry, binding) => {
      let varDeclaration = entry.isReadOnly
        ? 'var<storage, read>'
        : 'var<storage, read_write>';
      if (entry.buffer.isUniform) varDeclaration = 'var<uniform>';

      const {wgslIdentifier, wgslType} = entry.buffer.options;
      const entryWgsl = `${varDeclaration} ${wgslIdentifier}: ${wgslType};`;

      wgsl += `@group(${group}) @binding(${binding}) ${entryWgsl}\n`;
    });

    return wgsl;
  }
}

export {BindGroup, BindGroupOptions};
