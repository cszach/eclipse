import {RenderData} from '../renderers/RenderData.js';
import {ResizeData} from '../renderers/ResizeData.js';

enum BufferType {
  FrameResolution,
  Frame,
  FrameCount,
  CameraPosition,
  Viewport,
  Vertex,
  Index,
  Material,
  WorldMatrix,
  NormalMatrix,
  SceneStats,
}

type BufferOnBeforeRenderCallback = (
  renderData: RenderData,
  buffer: Buffer
) => void;

type BufferOnCanvasResizeCallback = (
  resizeData: ResizeData,
  buffer: Buffer
) => void;

type BufferOptions = {
  label?: string;
  wgslIdentifier: string;
  wgslType: string;
  usage: number;
  staticSize?: number;
  mappedAtCreation?: boolean;
  onBeforeRender?: BufferOnBeforeRenderCallback;
  onCanvasResize?: BufferOnCanvasResizeCallback;
};

const predefinedOptions: {[type: number]: BufferOptions} = {
  [BufferType.FrameResolution]: {
    label: 'Frame resolution buffer',
    wgslIdentifier: 'resolution',
    wgslType: 'vec2u',
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    staticSize: 2 * Uint32Array.BYTES_PER_ELEMENT,
  },
  [BufferType.Frame]: {
    label: 'Frame buffer',
    wgslIdentifier: 'frame_buffer',
    wgslType: 'array<vec3f>',
    usage: GPUBufferUsage.STORAGE,
  },
  [BufferType.FrameCount]: {
    label: 'Frame count buffer',
    wgslIdentifier: 'frame_count',
    wgslType: 'u32',
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    staticSize: 4,
  },
  [BufferType.CameraPosition]: {
    label: 'Camera position buffer',
    wgslIdentifier: 'camera_position',
    wgslType: 'vec3f',
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    staticSize: 3 * Float32Array.BYTES_PER_ELEMENT,
  },
  [BufferType.Viewport]: {
    label: 'Viewport buffer',
    wgslIdentifier: 'viewport',
    wgslType: 'Viewport',
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    staticSize: (9 + 3) * Float32Array.BYTES_PER_ELEMENT,
  },
  [BufferType.Vertex]: {
    label: 'Vertex buffer',
    wgslIdentifier: 'vertices',
    wgslType: 'array<Vertex>',
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  },
  [BufferType.Index]: {
    label: 'Index buffer',
    wgslIdentifier: 'triangles',
    wgslType: 'array<Triangle>',
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  },
  [BufferType.Material]: {
    label: 'Material buffer',
    wgslIdentifier: 'materials',
    wgslType: 'array<Material>',
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  },
  [BufferType.WorldMatrix]: {
    label: 'World matrix buffer',
    wgslIdentifier: 'world_matrices',
    wgslType: 'array<mat4x4f>',
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  },
  [BufferType.NormalMatrix]: {
    label: 'Normal matrix buffer',
    wgslIdentifier: 'normal_matrices',
    wgslType: 'array<mat4x4f>',
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  },
  [BufferType.SceneStats]: {
    label: 'Scene stats buffer',
    wgslIdentifier: 'scene_stats',
    wgslType: 'SceneStats',
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    staticSize: 4 * Uint32Array.BYTES_PER_ELEMENT,
  },
};

class Buffer {
  options: BufferOptions;
  size?: number;
  onBeforeRender?: BufferOnBeforeRenderCallback;
  onCanvasResize?: BufferOnCanvasResizeCallback;
  device?: GPUDevice;
  gpuObject?: GPUBuffer;
  static readonly predefinedOptions = predefinedOptions;

  static ofType(type: BufferType): Buffer {
    return new Buffer(predefinedOptions[type]);
  }

  constructor(options: BufferOptions) {
    this.options = options;
    this.size = options.staticSize;
  }

  get isDynamic(): boolean {
    return this.options.staticSize === undefined;
  }

  get isUniform(): boolean {
    return this.hasUsage(GPUBufferUsage.UNIFORM);
  }

  get isWritable(): boolean {
    return this.hasUsage(GPUBufferUsage.COPY_DST);
  }

  hasUsage(usage: number): boolean {
    return (this.options.usage & usage) === usage;
  }

  build(device: GPUDevice, destroyOld = false) {
    if (this.size === undefined) {
      throw new Error(`Buffer "${this.options.label}" does not have a size.`);
    }

    if (destroyOld && this.gpuObject !== undefined) this.gpuObject.destroy();

    this.gpuObject = device.createBuffer({
      label: this.options.label,
      usage: this.options.usage,
      size: this.size,
      mappedAtCreation: this.options.mappedAtCreation,
    });

    this.device = device;
  }

  write(data: BufferSource, bufferOffset = 0, dataOffset = 0) {
    if (!this.device) {
      throw new Error(
        `Buffer "${this.options.label}" is not built. Call .build() first.`
      );
    }

    if (!this.isWritable) {
      throw new Error(
        `Buffer "${this.options.label}" does not have COPY_DST usage.`
      );
    }

    this.device.queue.writeBuffer(
      this.gpuObject!,
      bufferOffset,
      data,
      dataOffset
    );
  }

  writeMapped(data: BufferSource, bufferOffset = 0, dataOffset = 0) {
    if (!this.gpuObject) {
      throw new Error(
        `Buffer "${this.options.label}" is not built. Call .build() first.`
      );
    }

    if (!this.options.mappedAtCreation) {
      throw new Error(
        `Buffer "${this.options.label}" is not mapped at creation.`
      );
    }

    // @ts-expect-error The data constructor will (likely) be either
    // Int32ArrayConstructor, Uint32ArrayConstructor or Float32ArrayConstructor.
    new data.constructor(this.gpuObject.getMappedRange(bufferOffset)).set(
      data,
      dataOffset
    );
    this.gpuObject.unmap();
  }

  // TODO: growing might exceed the max storage buffer size
  grow(capacity: number, growFactor = 2): boolean {
    if (this.size === undefined) {
      throw new Error(`Buffer "${this.options.label}" does not have a size.`);
    }

    if (this.size > capacity) return false;

    while (this.size < capacity) {
      this.size *= growFactor;
    }

    return true;
  }
}

export {
  Buffer,
  BufferType,
  BufferOptions,
  BufferOnBeforeRenderCallback,
  BufferOnCanvasResizeCallback,
};
