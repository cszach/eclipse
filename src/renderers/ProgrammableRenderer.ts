import {PerspectiveCamera} from '../cameras/exports.js';
import {Scene} from '../primitives/exports.js';
import {Renderer, RenderData, RendererOptions} from './exports.js';
import {
  Buffer,
  BufferType,
  BindGroup,
  ComputePipeline,
  ComputeFor,
} from '../webgpu-utils/exports.js';
import {SceneUtils, ViewportUtils} from './utils/exports.js';

// Shaders
import {frameBufferViewWgsl} from './shaders/exports.js';

class ProgrammableRenderer implements Renderer {
  protected options: RendererOptions;
  protected buffers: Buffer[];
  protected bindGroups: BindGroup[];
  protected pipelines: ComputePipeline[];

  canvas: HTMLCanvasElement;

  protected isInitialized = false;
  protected device?: GPUDevice;
  protected context?: GPUCanvasContext;
  protected format?: GPUTextureFormat;
  protected animationFrame?: () => void;

  // Ray tracing
  frameCount = 0;
  frameResolutionBuffer: Buffer;
  frameBuffer: Buffer;
  frameCountBuffer: Buffer;
  cameraPositionBuffer: Buffer;
  viewportBuffer: Buffer;
  vertexBuffer: Buffer;
  indexBuffer: Buffer;
  materialBuffer: Buffer;
  rayTracingBindGroup: BindGroup;

  // Frame buffer view
  private frameBufferViewVertexBuffer?: GPUBuffer;
  private frameBufferViewBindGroup: BindGroup;
  private renderPipeline?: GPURenderPipeline;

  constructor(options: RendererOptions = {}, initialize = true) {
    this.options = options;
    this.canvas = options.canvas ?? document.createElement('canvas');

    // Ray tracing buffers
    this.frameResolutionBuffer = Buffer.ofType(BufferType.FrameResolution);
    this.frameBuffer = Buffer.ofType(BufferType.Frame);
    this.frameCountBuffer = Buffer.ofType(BufferType.FrameCount);
    this.cameraPositionBuffer = Buffer.ofType(BufferType.CameraPosition);
    this.viewportBuffer = Buffer.ofType(BufferType.Viewport);
    this.vertexBuffer = Buffer.ofType(BufferType.Vertex);
    this.indexBuffer = Buffer.ofType(BufferType.Index);
    this.materialBuffer = Buffer.ofType(BufferType.Material);

    // Ray tracing bind group
    this.rayTracingBindGroup = new BindGroup({label: 'Ray tracing bind group'});
    this.rayTracingBindGroup.addBuffer(
      this.frameResolutionBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    this.rayTracingBindGroup.addBuffer(
      this.frameBuffer,
      GPUShaderStage.COMPUTE,
      false
    );
    this.rayTracingBindGroup.addBuffer(
      this.frameCountBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    this.rayTracingBindGroup.addBuffer(
      this.cameraPositionBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    this.rayTracingBindGroup.addBuffer(
      this.viewportBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    this.rayTracingBindGroup.addBuffer(
      this.vertexBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    this.rayTracingBindGroup.addBuffer(
      this.indexBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    this.rayTracingBindGroup.addBuffer(
      this.materialBuffer,
      GPUShaderStage.COMPUTE,
      true
    );

    this.buffers = [];
    this.bindGroups = [];
    this.pipelines = [];

    // Frame buffer view
    this.frameBufferViewBindGroup = new BindGroup({
      label: 'Frame buffer view bind group',
    });
    this.frameBufferViewBindGroup.addBuffer(
      this.frameResolutionBuffer,
      GPUShaderStage.FRAGMENT,
      true
    );
    this.frameBufferViewBindGroup.addBuffer(
      this.frameBuffer,
      GPUShaderStage.FRAGMENT,
      true
    );
    this.frameBufferViewBindGroup.addBuffer(
      this.frameCountBuffer,
      GPUShaderStage.FRAGMENT,
      true
    );

    // Initialize
    if (initialize) {
      Promise.resolve(this.init()).then(() => {
        if (this.animationFrame) {
          window.requestAnimationFrame(this.animationFrame);
        }
      });
    }
  }

  addBuffer(newBuffer: Buffer) {
    this.buffers.push(newBuffer);
  }

  addBindGroup(newBindGroup: BindGroup) {
    this.bindGroups.push(newBindGroup);
  }

  addPipeline(newPipeline: ComputePipeline) {
    this.pipelines.push(newPipeline);
  }

  protected async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Renderer is already initialized.');
      return;
    }

    // Get WebGPU device

    if (!navigator.gpu) throw Error('WebGPU is not supported in this browser.');

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: this.options?.powerPreference,
    });
    if (!adapter) throw Error('Could not request WebGPU adapter.');

    const device = await adapter.requestDevice({
      requiredLimits: {
        maxStorageBufferBindingSize:
          this.options.maxStorageBufferBindingSize ?? 128 * 1024 * 1024,
      },
    });
    if (!device) throw Error('Could not request WebGPU logical device.');

    // Extract info from the canvas, build static buffers, build pipelines, and
    // prepare the render pipeline (the frame buffer view).

    const format = this.setCanvasFormatAndContext(device, this.options.context);

    this.buffers
      .filter(buffer => !buffer.isDynamic)
      .forEach(staticBuffer => staticBuffer.build(device));
    this.pipelines.forEach(pipeline => pipeline.build(device));
    this.setVertexBuffer(device);
    this.setRenderPipeline(device, format);

    this.device = device;
    this.isInitialized = true;
  }

  private setCanvasFormatAndContext(
    device: GPUDevice,
    context?: GPUCanvasContext
  ): GPUTextureFormat {
    const ctx = context ?? this.canvas.getContext('webgpu');

    if (!ctx) {
      throw new Error('WebGPU context not found.');
    }

    this.context = ctx;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({device, format: this.format});

    return this.format;
  }

  private setVertexBuffer(device: GPUDevice) {
    // v0-------v1          Y        (0, 0)---> U
    //  |        |          ^             |
    //  |        |          |             v
    // v3-------v2   (-1, -1)--->X        V
    // prettier-ignore
    const vertexData = new Float32Array([
    // X   Y  U  V
      -1, -1, 0, 1, // v3
       1, -1, 1, 1, // v2
      -1,  1, 0, 0, // v0
      -1,  1, 0, 0, // v0
       1, -1, 1, 1, // v2
       1,  1, 1, 0, // v1
    ]);

    this.frameBufferViewVertexBuffer = device.createBuffer({
      label: 'Ray tracer vertex buffer',
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.frameBufferViewVertexBuffer.getMappedRange()).set(
      vertexData
    );
    this.frameBufferViewVertexBuffer.unmap();
  }

  private setRenderPipeline(device: GPUDevice, format: GPUTextureFormat) {
    const vertexBufferLayout: GPUVertexBufferLayout = {
      arrayStride: 4 * 4,
      attributes: [
        {
          // position
          format: 'float32x2',
          offset: 0,
          shaderLocation: 1,
        },
        {
          // uv
          format: 'float32x2',
          offset: 8,
          shaderLocation: 2,
        },
      ],
    };

    const module = device.createShaderModule({
      code: this.frameBufferViewBindGroup.wgsl(0) + frameBufferViewWgsl,
    });

    this.frameBufferViewBindGroup.buildLayout(device);

    const pipelineLayout = device.createPipelineLayout({
      label: 'Render pipeline layout',
      bindGroupLayouts: [this.frameBufferViewBindGroup.layout!],
    });

    this.renderPipeline = device.createRenderPipeline({
      label: 'Frame buffer view render pipeline',
      layout: pipelineLayout,
      vertex: {
        module: module,
        entryPoint: 'vertexMain',
        buffers: [vertexBufferLayout],
      },
      fragment: {
        module: module,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: format,
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
        frontFace: 'ccw',
        cullMode: 'back',
      },
    });
  }

  setRenderLoop(newRenderLoop: () => void) {
    const animationFrame = () => {
      newRenderLoop();
      window.requestAnimationFrame(animationFrame);
    };
    this.animationFrame = animationFrame;

    if (this.isInitialized) {
      window.requestAnimationFrame(animationFrame);
    }
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    if (!this.isInitialized) {
      throw new Error('Renderer has not been initialized.');
    }

    this.frameCount++;

    const renderData: RenderData = {
      device: this.device!,
      canvas: this.canvas,
      frameCount: this.frameCount,
      camera,
      scene: SceneUtils.getData(scene, true),
      viewport: ViewportUtils.getData(camera, this.canvas),
      sceneChanged: !this.vertexBuffer.gpuObject || scene.stats.outdated,
    };

    this.buffers
      .filter(buffer => buffer.options.onBeforeRender)
      .forEach(buffer => buffer.options.onBeforeRender!(renderData, buffer));

    const encoder = this.device!.createCommandEncoder();

    this.pipelines.forEach(pipeline => {
      switch (pipeline.options.frequency) {
        case ComputeFor.EveryPixel:
          pipeline.run(encoder, {x: this.canvas.width, y: this.canvas.height});
          break;

        case ComputeFor.Every512Triangle:
          pipeline.run(encoder, {x: scene.stats.triangles / 512});
          break;
      }
    });

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context!.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: [0, 0, 0, 1],
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this.renderPipeline!);
    renderPass.setVertexBuffer(0, this.frameBufferViewVertexBuffer!);
    this.frameBufferViewBindGroup.build(this.device!);
    renderPass.setBindGroup(0, this.frameBufferViewBindGroup.gpuObject!);

    renderPass.draw(6);
    renderPass.end();

    this.device!.queue.submit([encoder.finish()]);
  }
}

export {ProgrammableRenderer};
