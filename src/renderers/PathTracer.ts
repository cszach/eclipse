import {
  BindGroup,
  Buffer,
  ComputeFor,
  ComputePipeline,
} from '../webgpu-utils/exports.js';
import {RayTracerBase} from './RayTracerBase.js';
import {RendererOptions} from './RendererOptions.js';

// WGSL
import {
  constantsWgsl,
  primitivesWgsl,
  randomWgsl,
  rayTracerWgsl,
  hlbvhWgsl,
} from './shaders/exports.js';

class PathTracer extends RayTracerBase {
  private _observeCanvasResize = true;
  private canvasResizeObserver: ResizeObserver;

  constructor(options?: RendererOptions) {
    super(
      {
        ...options,
        maxStorageBufferBindingSize: 512 * 1024 * 1024,
      },
      false
    );

    // BVH construction

    const bvhConstructionBindGroup = new BindGroup({
      label: 'BVH construction bind group',
    });

    const bvhBuffer = new Buffer({
      label: 'BVH buffer',
      wgslIdentifier: 'bvh',
      wgslType: 'array<AABB>',
      usage: GPUBufferUsage.STORAGE,
      onBeforeRender: (data, buffer) => {
        buffer.size = (data.sceneStats.triangles * 2 - 1) * 12 * 4;
        buffer.build(data.device);
      },
    });

    const mortonCodeBuffer = new Buffer({
      label: 'Morton code buffer',
      wgslIdentifier: 'morton_codes',
      wgslType: 'array<u32>',
      usage: GPUBufferUsage.STORAGE,
      onBeforeRender: (data, buffer) => {
        buffer.size = data.sceneStats.triangles * 4;
        buffer.build(data.device);
        bvhConstructionBindGroup.build(data.device);
      },
    });

    bvhConstructionBindGroup.addBuffer(
      bvhBuffer,
      GPUShaderStage.COMPUTE,
      false
    );
    bvhConstructionBindGroup.addBuffer(
      mortonCodeBuffer,
      GPUShaderStage.COMPUTE,
      false
    );
    bvhConstructionBindGroup.addBuffer(
      this.sceneStatsBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    bvhConstructionBindGroup.addBuffer(
      this.vertexBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    bvhConstructionBindGroup.addBuffer(
      this.indexBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    bvhConstructionBindGroup.addBuffer(
      this.worldMatrixBuffer,
      GPUShaderStage.COMPUTE,
      true
    );

    const mortonCodeAssignmentPipeline = new ComputePipeline({
      label: 'Morton code assignment pipeline',
      bindGroups: [bvhConstructionBindGroup],
      code: constantsWgsl + primitivesWgsl + hlbvhWgsl,
      entryPoint: 'assignMortonCodes',
      workgroupSize: {x: 64},
      frequency: ComputeFor.Every512Triangle,
    });

    this.buffers.push(
      this.frameResolutionBuffer,
      this.frameBuffer,
      this.frameCountBuffer,
      this.cameraPositionBuffer,
      this.viewportBuffer,
      this.vertexBuffer,
      this.indexBuffer,
      this.materialBuffer,
      this.worldMatrixBuffer,
      this.normalMatrixBuffer,
      this.sceneStatsBuffer,
      bvhBuffer,
      mortonCodeBuffer
    );

    const rayTracingPipeline = new ComputePipeline({
      label: 'Ray tracing pipeline',
      bindGroups: [this.rayTracingBindGroup],
      code: constantsWgsl + primitivesWgsl + randomWgsl + rayTracerWgsl,
      entryPoint: 'rayTrace',
      workgroupSize: {x: 8, y: 8},
      frequency: ComputeFor.EveryPixel,
    });

    this.addPipeline(mortonCodeAssignmentPipeline);
    this.addPipeline(rayTracingPipeline);

    // Resize observer

    this.canvasResizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        const canvas = entry.target as HTMLCanvasElement;
        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;

        canvas.width = width;
        canvas.height = height;

        this.onCanvasResize();
      });
    });

    Promise.resolve(this.init()).then(() => {
      this.observeCanvasResize = this._observeCanvasResize;
      this.onCanvasResize(); // TODO: should we call this here?

      if (this.animationFrame) {
        window.requestAnimationFrame(this.animationFrame);
      }
    });
  }

  get observeCanvasResize(): boolean {
    return this._observeCanvasResize;
  }

  set observeCanvasResize(value: boolean) {
    this._observeCanvasResize = value;

    if (this._observeCanvasResize) {
      this.canvasResizeObserver.observe(this.canvas);
    } else {
      this.canvasResizeObserver.unobserve(this.canvas);
    }
  }

  onCanvasResize() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    this.buffers
      .filter(buffer => buffer.onCanvasResize)
      .forEach(buffer =>
        buffer.onCanvasResize!(
          {
            canvas: this.canvas,
            device: this.device!,
          },
          buffer
        )
      );

    this.rayTracingBindGroup.build(this.device);

    this.frameCount = 0;
  }
}

export {PathTracer};
