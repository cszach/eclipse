import {RenderData, ResizeData} from '../renderers/exports.js';

enum BufferType {
  FrameResolution,
  Frame,
  FrameCount,
  CameraPosition,
  Viewport,
  Vertex,
  Index,
  Material,
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
    onCanvasResize: (renderData, buffer) => {
      console.log(renderData.canvas.width);
      buffer.write(
        new Uint32Array([renderData.canvas.width, renderData.canvas.height])
      );
    },
  },
  [BufferType.Frame]: {
    label: 'Frame buffer',
    wgslIdentifier: 'frame_buffer',
    wgslType: 'array<vec3f>',
    usage: GPUBufferUsage.STORAGE,
    onBeforeRender: (renderData, buffer) => {
      if (renderData.sceneChanged) {
        buffer.size =
          4 * // RGBA
          Float32Array.BYTES_PER_ELEMENT *
          renderData.canvas.width *
          renderData.canvas.height;
        buffer.build(renderData.device, true);
      }
    },
    onCanvasResize: (resizeData, buffer) => {
      buffer.size =
        4 *
        Float32Array.BYTES_PER_ELEMENT *
        resizeData.canvas.width *
        resizeData.canvas.height;
      buffer.build(resizeData.device, true);
    },
  },
  [BufferType.FrameCount]: {
    label: 'Frame count buffer',
    wgslIdentifier: 'frame_count',
    wgslType: 'u32',
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    staticSize: 4,
    onBeforeRender: (renderData, buffer) => {
      buffer.write(new Uint32Array([renderData.frameCount]));
    },
  },
  [BufferType.CameraPosition]: {
    label: 'Camera position buffer',
    wgslIdentifier: 'camera_position',
    wgslType: 'vec3f',
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    staticSize: 3 * Float32Array.BYTES_PER_ELEMENT,
    onBeforeRender: (renderData, buffer) => {
      buffer.write(renderData.camera.localPosition); // FIXME: use global pos
    },
  },
  [BufferType.Viewport]: {
    label: 'Viewport buffer',
    wgslIdentifier: 'viewport',
    wgslType: 'Viewport',
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    staticSize: (9 + 3) * Float32Array.BYTES_PER_ELEMENT,
    onBeforeRender: (renderData, buffer) => {
      const {origin, du, dv} = renderData.viewport;

      // prettier-ignore
      buffer.write(new Float32Array([
        origin[0], origin[1], origin[2], 0,
            du[0],     du[1],     du[2], 0,
            dv[0],     dv[1],     dv[2], 0
      ]))
    },
  },
  [BufferType.Vertex]: {
    label: 'Vertex buffer',
    wgslIdentifier: 'vertices',
    wgslType: 'array<Vertex>',
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
    onBeforeRender: (renderData, buffer) => {
      if (renderData.sceneChanged) {
        buffer.size = renderData.scene.vertexData.byteLength;
        buffer.build(renderData.device, true);
        buffer.writeMapped(renderData.scene.vertexData);
      }
    },
  },
  [BufferType.Index]: {
    label: 'Index buffer',
    wgslIdentifier: 'triangles',
    wgslType: 'array<Triangle>',
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
    onBeforeRender: (renderData, buffer) => {
      if (renderData.sceneChanged) {
        buffer.size = renderData.scene.indexData.byteLength;
        buffer.build(renderData.device, true);
        buffer.writeMapped(renderData.scene.indexData);
      }
    },
  },
  [BufferType.Material]: {
    label: 'Material buffer',
    wgslIdentifier: 'materials',
    wgslType: 'array<Material>',
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
    onBeforeRender: (renderData, buffer) => {
      if (renderData.sceneChanged) {
        buffer.size = renderData.scene.materialData.byteLength;
        buffer.build(renderData.device, true);
        buffer.writeMapped(renderData.scene.materialData);
      }
    },
  },
};

class Buffer {
  options: BufferOptions;
  size?: number;
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
}

export {
  Buffer,
  BufferType,
  BufferOptions,
  BufferOnBeforeRenderCallback,
  BufferOnCanvasResizeCallback,
};
