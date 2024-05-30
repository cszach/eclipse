type Capacities = {
  vertices: number;
  triangles: number;
  objects: number;
  materials: number;
};

type RendererOptions = {
  canvas?: HTMLCanvasElement;
  context?: GPUCanvasContext;
  powerPreference?: GPUPowerPreference;
  maxStorageBufferBindingSize?: number; // 128 MB by WebGPU default
  initialCapacities?: Capacities;
};

export {RendererOptions, Capacities};
