import {PerspectiveCamera} from '../cameras/exports.js';
import {Scene} from '../primitives/exports.js';
import {Renderer} from './Renderer.js';

// Shaders
import raytracerShader from './raytracer.wgsl';
import randomShader from './random.wgsl';

class Raytracer implements Renderer {
  readonly canvas: HTMLCanvasElement;

  // GPU stuff
  private device?: GPUDevice;
  private context?: GPUCanvasContext | null;
  private format?: GPUTextureFormat;
  private renderPassDescriptor?: GPURenderPassDescriptor;
  private bindGroupLayout?: GPUBindGroupLayout;
  private bindGroup?: GPUBindGroup;
  private computePipeline?: GPUComputePipeline;
  private renderPipeline?: GPURenderPipeline;

  private imageDimensionsBuffer?: GPUBuffer;

  private viewProjectionMatrixBuffer?: GPUBuffer;
  private cameraPositionBuffer?: GPUBuffer;
  private vertexBuffer?: GPUBuffer;
  private indexBuffer?: GPUBuffer;
  private materialBuffer?: GPUBuffer;
  private lightBuffer?: GPUBuffer;

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas ?? document.createElement('canvas');
  }

  async init(): Promise<void> {
    // Get WebGPU device

    if (!navigator.gpu) throw Error('WebGPU is not supported in this browser.');

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Error('Could not request WebGPU adapter.');

    const device = await adapter.requestDevice({
      requiredLimits: {
        maxStorageBufferBindingSize: 536870912, // 512 MB
      },
    });
    if (!device) throw Error('Could not request WebGPU logical device.');

    this.device = device;

    this.setCanvasFormatAndContext();
    this.setRenderPassDescriptor();
    this.setBindGroup();
    this.setVertexBuffer();
    this.setPipeline();
  }

  render(scene: Scene, camera: PerspectiveCamera) {
    if (
      !this.device ||
      !this.context ||
      !this.renderPassDescriptor ||
      !this.renderPipeline ||
      !this.vertexBuffer //||
      // !this.bindGroup
    ) {
      throw Error('Renderer has not been initiated. Call .init() first.');
    }

    const canvasTexture = this.context.getCurrentTexture();

    this.renderPassDescriptor.colorAttachments[0].view =
      canvasTexture.createView();

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass(this.renderPassDescriptor);

    pass.setPipeline(this.renderPipeline);
    pass.setVertexBuffer(0, this.vertexBuffer);
    // pass.setBindGroup(0, this.bindGroup);

    pass.draw(6);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  private setCanvasFormatAndContext() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    this.context = this.canvas.getContext('webgpu');

    if (!this.context) {
      throw new Error('WebGPU context not found.');
    }

    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({device: this.device, format: this.format});
  }

  private setRenderPassDescriptor() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    if (!this.context) {
      throw new Error(
        'Canvas context has not been set. Call .setCanvasFormatAndContext() first.'
      );
    }

    const canvasTexture = this.context.getCurrentTexture();

    this.renderPassDescriptor = {
      label: 'Rasterizer render pass descriptor',
      colorAttachments: [
        {
          view: canvasTexture.createView(),
          loadOp: 'clear',
          clearValue: [0, 0, 0, 1],
          storeOp: 'store',
        },
      ],
    };
  }

  private setBindGroup() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    this.bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Rasterizer bind group layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {type: 'uniform'},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          buffer: {type: 'storage'},
        },
      ],
    });

    // TODO: frame buffer

    this.imageDimensionsBuffer = this.device.createBuffer({
      label: 'Ray tracer image dimensions buffer',
      size: 2 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private setVertexBuffer() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

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

    this.vertexBuffer = this.device.createBuffer({
      label: 'Ray tracer vertex buffer',
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(vertexData);
    this.vertexBuffer.unmap();
  }

  private setPipeline() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    if (!this.format) {
      throw new Error(
        'Canvas format has not been set. Call .setCanvasFormatAndContext() first.'
      );
    }

    if (!this.bindGroupLayout) {
      throw new Error(
        'Bind group layout has not been set. Call .setBindGroup() first.'
      );
    }

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

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Rasterizer pipeline layout',
      bindGroupLayouts: [
        /*this.bindGroupLayout*/
      ],
    });

    const module = this.device.createShaderModule({
      code: randomShader + raytracerShader,
    });

    this.renderPipeline = this.device.createRenderPipeline({
      label: 'Rasterizer pipeline',
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
            format: this.format,
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
}

export {Raytracer};
