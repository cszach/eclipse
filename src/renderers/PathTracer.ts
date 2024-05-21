import {ComputeFor, ComputePipeline} from '../webgpu-utils/exports.js';
import {ProgrammableRenderer} from './ProgrammableRenderer.js';
import {RendererOptions} from './RendererOptions.js';

// Shaders
import constants from './shaders/constants.wgsl';
import primitives from './shaders/primitives.wgsl';
import random from './shaders/random.wgsl';
import rayTracerShader from './shaders/ray_tracer.wgsl';

class PathTracer extends ProgrammableRenderer {
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

    Promise.resolve(this.init()).then(() => {
      if (this.animationFrame) {
        window.requestAnimationFrame(this.animationFrame);
      }
    });
  }

  onCanvasResize() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    this.frameBuffer.size =
      4 * // RGBA
      Float32Array.BYTES_PER_ELEMENT *
      this.canvas.width *
      this.canvas.height;

    this.frameResolutionBuffer.writeMapped(
      new Uint32Array([this.canvas.width, this.canvas.height])
    );

    this.frameCount = 0;
  }
}

export {PathTracer};
