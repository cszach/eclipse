import {Texture} from '../textures/Texture.js';
import {Buffer} from './Buffer.js';
import {Sampler} from './Sampler.js';

type BindGroupOptions = {
  label?: string;
};

class BindGroup {
  options: BindGroupOptions;
  entries: {
    buffer?: Buffer;
    texture?: Texture;
    sampler?: Sampler;
    visibility: number;
    isReadOnly?: boolean;
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

  addTexture(texture: Texture, visibility: number) {
    this.entries.push({texture, visibility});
  }

  addSampler(sampler: Sampler, visibility: number) {
    this.entries.push({sampler, visibility});
  }

  buildLayout(device: GPUDevice) {
    const entries = this.entries.map((entry, binding) => {
      if (entry.buffer) {
        let type: GPUBufferBindingType = entry.isReadOnly
          ? 'read-only-storage'
          : 'storage';
        if (entry.buffer.isUniform) type = 'uniform';

        return {
          binding,
          visibility: entry.visibility,
          buffer: {type},
        } as GPUBindGroupLayoutEntry;
      } else if (entry.texture) {
        return {
          binding,
          visibility: entry.visibility,
          texture: {
            viewDimension: '2d',
            sampleType: 'float',
            multisampled: false,
          },
        } as GPUBindGroupLayoutEntry;
      } else {
        // sampler

        return {
          binding,
          visibility: entry.visibility,
          sampler: {
            type: 'filtering',
          },
        };
      }
    });

    this.layout = device.createBindGroupLayout({
      label: this.options.label ? `${this.options.label} layout` : undefined,
      entries,
    });
  }

  build(device: GPUDevice) {
    if (!this.layout) this.buildLayout(device);

    const entries: GPUBindGroupEntry[] = this.entries.map((entry, binding) => {
      if (entry.buffer && !entry.buffer.gpuObject) {
        entry.buffer.build(device);
      }

      if (entry.texture && !entry.texture.gpuObject) {
        entry.texture.build(device);
      }

      if (entry.sampler && !entry.sampler.gpuObject) {
        entry.sampler.build(device);
      }

      if (entry.buffer) {
        return {
          binding,
          resource: {
            buffer: entry.buffer?.gpuObject!,
          },
        };
      } else if (entry.texture) {
        return {
          binding,
          resource: entry.texture?.gpuObject!.createView(),
        };
      } else {
        // sampler
        return {
          binding,
          resource: entry.sampler?.gpuObject!,
        };
      }
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
      let entryWgsl = '';

      if (entry.buffer) {
        let varDeclaration = entry.isReadOnly
          ? 'var<storage, read>'
          : 'var<storage, read_write>';
        if (entry.buffer.isUniform) varDeclaration = 'var<uniform>';

        const {wgslIdentifier, wgslType} = entry.buffer.options;
        entryWgsl = `${varDeclaration} ${wgslIdentifier}: ${wgslType};`;
      } else if (entry.texture) {
        const {wgslIdentifier, wgslType} = entry.texture.options;
        entryWgsl = `var ${wgslIdentifier}: ${wgslType};`;
      } else if (entry.sampler) {
        const {wgslIdentifier, wgslType} = entry.sampler.options;
        entryWgsl = `var ${wgslIdentifier}: ${wgslType};`;
      }

      wgsl += `@group(${group}) @binding(${binding}) ${entryWgsl}\n`;
    });

    return wgsl;
  }
}

export {BindGroup, BindGroupOptions};
