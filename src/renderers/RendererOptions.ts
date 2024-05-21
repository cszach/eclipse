type RendererOptions = {
  canvas?: HTMLCanvasElement;
  context?: GPUCanvasContext;
  powerPreference?: GPUPowerPreference;
  maxStorageBufferBindingSize?: number; // 128 MB by WebGPU default
};

export {RendererOptions};
