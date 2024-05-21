import {ComputeFor, ComputePipeline} from '../webgpu-utils/exports.js';
import {ProgrammableRenderer} from './ProgrammableRenderer.js';
import {RendererOptions} from './RendererOptions.js';

// Shaders
import constants from './shaders/constants.wgsl';
import primitives from './shaders/primitives.wgsl';
import random from './shaders/random.wgsl';
import rayTracerShader from './shaders/ray_tracer.wgsl';

class PathTracer extends ProgrammableRenderer {
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

    this.buffers.push(
      this.frameResolutionBuffer,
      this.frameBuffer,
      this.frameCountBuffer,
      this.cameraPositionBuffer,
      this.viewportBuffer,
      this.vertexBuffer,
      this.indexBuffer,
      this.materialBuffer
    );

    const rayTracingPipeline = new ComputePipeline({
      label: 'Ray tracing pipeline',
      bindGroups: [this.rayTracingBindGroup],
      code: constants + primitives + random + rayTracerShader,
      entryPoint: 'rayTrace',
      workgroupSize: {x: 8, y: 8},
      frequency: ComputeFor.EveryPixel,
    });

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
      .filter(buffer => buffer.options.onCanvasResize)
      .forEach(buffer =>
        buffer.options.onCanvasResize!(
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
