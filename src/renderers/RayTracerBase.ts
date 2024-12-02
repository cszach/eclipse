import {PerspectiveCamera} from '../cameras/PerspectiveCamera.js';
import {Scene} from '../primitives/Scene.js';
import {
  DEFAULT_MAX_STORAGE_BUFFER_BINDING_SIZE,
  DEFAULT_VERTEX_CAPACITY,
  DEFAULT_TRIANGLE_CAPACITY,
  DEFAULT_MATERIAL_CAPACITY,
  DEFAULT_MESH_CAPACITY,
} from './constants.js';
import {Capacities, RendererOptions} from './RendererOptions.js';
import {Renderer} from './Renderer.js';
import {RenderData} from './RenderData.js';
import {Buffer, BufferType} from '../wgpual/Buffer.js';
import {BindGroup} from '../wgpual/BindGroup.js';
import {ComputePipeline, ComputeFor} from '../wgpual/ComputePipeline.js';
import {Sampler} from '../wgpual/Sampler.js';
import {SceneUtils} from './utils/SceneUtils.js';
import {ViewportUtils} from './utils/ViewportUtils.js';

// Shaders
import frameBufferViewWgsl from './shaders/frame_buffer_view.wgsl';
import {TextureAtlas} from '../textures/TextureAtlas.js';

class RayTracerBase implements Renderer {
  buffers: Buffer[];
  textureAtlas?: TextureAtlas;
  bindGroups: BindGroup[];
  pipelines: ComputePipeline[];

  readonly options: RendererOptions;
  canvas: HTMLCanvasElement;
  isInitialized = false;
  device?: GPUDevice;
  context?: GPUCanvasContext;
  format?: GPUTextureFormat;
  animationFrame?: () => void;

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
  worldMatrixBuffer: Buffer;
  normalMatrixBuffer: Buffer;
  sceneStatsBuffer: Buffer;
  rayTracingBindGroup: BindGroup;
  private capacities: Capacities;

  // Frame buffer view
  private frameBufferViewVertexBuffer?: GPUBuffer;
  private frameBufferViewBindGroup: BindGroup;
  private renderPipeline?: GPURenderPipeline;

  constructor(options: RendererOptions = {}, initialize = true) {
    this.options = options;
    Object.freeze(this.options);

    this.canvas = options.canvas ?? document.createElement('canvas');
    this.capacities = {
      vertices: options.initialCapacities?.vertices ?? DEFAULT_VERTEX_CAPACITY,
      triangles:
        options.initialCapacities?.triangles ?? DEFAULT_TRIANGLE_CAPACITY,
      meshes: options.initialCapacities?.meshes ?? DEFAULT_MESH_CAPACITY,
      materials:
        options.initialCapacities?.materials ?? DEFAULT_MATERIAL_CAPACITY,
    };

    // Ray tracing buffers

    this.frameResolutionBuffer = Buffer.ofType(BufferType.FrameResolution);
    this.frameResolutionBuffer.onCanvasResize = (data, buffer) => {
      buffer.write(new Uint32Array([data.canvas.width, data.canvas.height]));
    };

    this.frameBuffer = Buffer.ofType(BufferType.Frame);
    this.frameBuffer.onCanvasResize = (data, buffer) => {
      buffer.size =
        4 * // RGBA
        Float32Array.BYTES_PER_ELEMENT *
        data.canvas.width *
        data.canvas.height;
      buffer.build(data.device, true);
    };

    this.frameCountBuffer = Buffer.ofType(BufferType.FrameCount);
    this.frameCountBuffer.onBeforeRender = (data, buffer) => {
      buffer.write(new Uint32Array([data.frameCount]));
    };

    this.cameraPositionBuffer = Buffer.ofType(BufferType.CameraPosition);
    this.cameraPositionBuffer.onBeforeRender = (data, buffer) => {
      buffer.write(data.camera.localPosition); // FIXME: use global pos
    };

    this.viewportBuffer = Buffer.ofType(BufferType.Viewport);
    this.viewportBuffer.onBeforeRender = (data, buffer) => {
      const {origin, du, dv} = data.viewport;

      // prettier-ignore
      buffer.write(new Float32Array([
        origin[0], origin[1], origin[2], 0,
            du[0],     du[1],     du[2], 0,
            dv[0],     dv[1],     dv[2], 0
      ]))
    };

    this.vertexBuffer = Buffer.ofType(BufferType.Vertex);
    this.vertexBuffer.size = this.capacities.vertices * 12 * 4;
    this.vertexBuffer.onBeforeRender = (data, buffer) => {
      if (data.sceneChanged) {
        const grown = buffer.grow(data.scene.vertexData.byteLength);
        buffer.build(data.device, grown);
        buffer.writeMapped(data.scene.vertexData);
        // this.rayTracingBindGroup.build(data.device);
      } else {
        buffer.gpuObject?.unmap();
      }
    };

    this.indexBuffer = Buffer.ofType(BufferType.Index);
    this.indexBuffer.size = this.capacities.triangles * 4 * 4;
    this.indexBuffer.onBeforeRender = (data, buffer) => {
      if (data.sceneChanged) {
        const grown = buffer.grow(data.scene.indexData.byteLength);
        buffer.build(data.device, grown);
        buffer.writeMapped(data.scene.indexData);
        // this.rayTracingBindGroup.build(data.device);
      } else {
        buffer.gpuObject?.unmap();
      }
    };

    this.materialBuffer = Buffer.ofType(BufferType.Material);
    this.materialBuffer.size = this.capacities.materials * 16 * 4;
    this.materialBuffer.onBeforeRender = (data, buffer) => {
      if (data.sceneChanged) {
        const grown = buffer.grow(data.scene.materialData.byteLength);
        buffer.build(data.device, grown);
        buffer.writeMapped(data.scene.materialData);
        // this.rayTracingBindGroup.build(data.device);
      } else {
        buffer.gpuObject?.unmap();
      }
    };

    this.worldMatrixBuffer = Buffer.ofType(BufferType.WorldMatrix);
    this.worldMatrixBuffer.size =
      this.capacities.meshes * 16 * Float32Array.BYTES_PER_ELEMENT;
    this.worldMatrixBuffer.onBeforeRender = (data, buffer) => {
      if (data.sceneChanged) {
        const grown = buffer.grow(data.scene.worldMatrixData.byteLength);
        buffer.build(data.device, grown);
        buffer.writeMapped(data.scene.worldMatrixData);
        // this.rayTracingBindGroup.build(data.device);
      } else {
        buffer.gpuObject?.unmap();
      }
    };

    this.normalMatrixBuffer = Buffer.ofType(BufferType.NormalMatrix);
    this.normalMatrixBuffer.size =
      this.capacities.meshes * 16 * Float32Array.BYTES_PER_ELEMENT;
    this.normalMatrixBuffer.onBeforeRender = (data, buffer) => {
      if (data.sceneChanged) {
        const grown = buffer.grow(data.scene.normalMatrixData.byteLength);
        buffer.build(data.device, grown);
        buffer.writeMapped(data.scene.normalMatrixData);
        // this.rayTracingBindGroup.build(data.device);
      } else {
        buffer.gpuObject?.unmap();
      }
    };

    this.sceneStatsBuffer = Buffer.ofType(BufferType.SceneStats);
    this.sceneStatsBuffer.onBeforeRender = (data, buffer) => {
      buffer.build(data.device);
      buffer.write(
        new Uint32Array([
          data.sceneStats.meshes,
          data.sceneStats.vertices,
          data.sceneStats.triangles,
          data.sceneStats.lights,
        ])
      );
    };

    // Texture atlas

    this.textureAtlas = new TextureAtlas(4096, [], {
      label: 'Texture atlas',
      wgslIdentifier: 'texture_atlas',
      wgslType: 'texture_2d<f32>',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
      format: 'rgba8unorm',
    });
    this.textureAtlas.onBeforeRender = (data, texture) => {
      const atlas = texture as TextureAtlas;
      atlas.reset();
      data.scene.textures.forEach(texture => {
        atlas.insert(texture);
      });
    };

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
    this.rayTracingBindGroup.addBuffer(
      this.worldMatrixBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    this.rayTracingBindGroup.addBuffer(
      this.normalMatrixBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    this.rayTracingBindGroup.addBuffer(
      this.sceneStatsBuffer,
      GPUShaderStage.COMPUTE,
      true
    );
    this.rayTracingBindGroup.addTexture(
      this.textureAtlas,
      GPUShaderStage.COMPUTE
    );
    this.rayTracingBindGroup.addSampler(
      Sampler.fromTexture(this.textureAtlas, {
        label: 'Texture atlas sampler',
        wgslIdentifier: 'texture_atlas_sampler',
        wgslType: 'sampler',
      }),
      GPUShaderStage.COMPUTE
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
          this.options.maxStorageBufferBindingSize ??
          DEFAULT_MAX_STORAGE_BUFFER_BINDING_SIZE,
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
    camera.aspectRatio = this.canvas.width / this.canvas.height;

    const sceneChanged = scene.stats.isOutdated;
    const sceneData = SceneUtils.getData(scene, true);
    const renderData: RenderData = {
      device: this.device!,
      canvas: this.canvas,
      frameCount: this.frameCount,
      camera,
      scene: sceneData,
      sceneStats: scene.stats,
      renderer: this,
      viewport: ViewportUtils.getData(camera, this.canvas),
      sceneChanged,
    };

    sceneData.textures.forEach(texture => {
      this.device?.queue.copyExternalImageToTexture(
        {source: texture.image as GPUImageCopyExternalImageSource},
        {
          texture: this.textureAtlas?.gpuObject!,
          origin: [texture.xOnAtlas, texture.yOnAtlas, 0],
        },
        [texture.widthOnAtlas, texture.heightOnAtlas]
      );
    });

    this.buffers
      .filter(buffer => buffer.onBeforeRender)
      .forEach(buffer => buffer.onBeforeRender!(renderData, buffer));

    // this.textureAtlas?.onBeforeRender!(renderData, this.textureAtlas);

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

export {RayTracerBase};
