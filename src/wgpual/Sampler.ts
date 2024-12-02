import {Texture} from '../textures/Texture.js';

type SamplerOptions = {
  label?: string;
  wgslIdentifier: string;
  wgslType: string;
};

class Sampler {
  wrapU: GPUAddressMode;
  wrapV: GPUAddressMode;
  minFilter: GPUFilterMode;
  magFilter: GPUFilterMode;
  gpuObject?: GPUSampler;
  options: SamplerOptions;

  static fromTexture(texture: Texture, options: SamplerOptions): Sampler {
    return new Sampler(
      texture.wrapU,
      texture.wrapV,
      texture.minFilter,
      texture.magFilter,
      options
    );
  }

  constructor(
    wrapU: GPUAddressMode,
    wrapV: GPUAddressMode,
    minFilter: GPUFilterMode,
    magFilter: GPUFilterMode,
    options: SamplerOptions
  ) {
    this.wrapU = wrapU;
    this.wrapV = wrapV;
    this.minFilter = minFilter;
    this.magFilter = magFilter;
    this.options = options;
  }

  build(device: GPUDevice) {
    this.gpuObject = device.createSampler({
      addressModeU: this.wrapU,
      addressModeV: this.wrapV,
      minFilter: this.minFilter,
      magFilter: this.magFilter,
    });
  }
}

export {Sampler};
