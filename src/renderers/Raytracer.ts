import {PerspectiveCamera} from '../cameras/exports.js';
import {Scene} from '../primitives/exports.js';
import {Renderer} from './Renderer.js';
import {vec3} from 'wgpu-matrix';
import {UP} from '../constants.js';

// Shaders
import randomShader from './random.wgsl';
import raytracerShader from './raytracer.wgsl';
import frameBufferViewShader from './frame_buffer_view.wgsl';

class Raytracer implements Renderer {
  readonly canvas: HTMLCanvasElement;

  // GPU stuff
  private device?: GPUDevice;
  private context?: GPUCanvasContext | null;
  private format?: GPUTextureFormat;
  private renderPassDescriptor?: GPURenderPassDescriptor;
  private bindGroupLayout?: GPUBindGroupLayout;
  private bindGroup?: GPUBindGroup;
  private pipelineLayout?: GPUPipelineLayout;
  private computePipeline?: GPUComputePipeline;
  private renderPipeline?: GPURenderPipeline;

  private frameBuffer?: GPUBuffer;
  private resolutionBuffer?: GPUBuffer;
  private frameNumberBuffer?: GPUBuffer;
  private cameraPositionBuffer?: GPUBuffer;
  private viewportBuffer?: GPUBuffer;

  private viewProjectionMatrixBuffer?: GPUBuffer;
  private cameraPositionBuffer?: GPUBuffer;
  private vertexBuffer?: GPUBuffer;
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

    this.resolutionBuffer = this.device.createBuffer({
      label: 'Ray tracer frame dimensions buffer',
      size: 2 * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.frameNumberBuffer = this.device.createBuffer({
      label: 'Ray tracer frame number buffer',
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.cameraPositionBuffer = this.device.createBuffer({
      label: 'Ray tracer camera position buffer',
      size: 3 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.viewportBuffer = this.device.createBuffer({
      label: 'Ray tracer viewport buffer',
      size: (9 + 3) * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.setCanvasFormatAndContext();
    this.setRenderPassDescriptor();
    this.setBindGroup();
    this.setVertexBuffer();
    this.setComputePipeline();
    this.setRenderPipeline();
    this.updateCanvas();
  }

  render(scene: Scene, camera: PerspectiveCamera, frame = 0) {
    if (
      !this.device ||
      !this.context ||
      !this.renderPassDescriptor ||
      !this.computePipeline ||
      !this.renderPipeline ||
      !this.vertexBuffer ||
      !this.bindGroupLayout ||
      !this.frameNumberBuffer ||
      !this.cameraPositionBuffer ||
      !this.viewportBuffer
    ) {
      throw Error('Renderer has not been initiated. Call .init() first.');
    }

    this.device.queue.writeBuffer(
      this.frameNumberBuffer,
      0,
      new Uint32Array([frame])
    );

    this.device.queue.writeBuffer(
      this.cameraPositionBuffer,
      0,
      camera.localPosition // TODO: consider global position
    );

    // Calculate viewport data

    const lookAt = [0, 0, 0];
    const focalLength = vec3.length(
      vec3.subtract(camera.localPosition, lookAt)
    );
    const h = Math.tan(camera.verticalFovRadians / 2);
    const viewportHeight = 2 * h * focalLength;
    const viewportWidth = viewportHeight * camera.aspectRatio;

    // Opposite of camera direction
    const w = vec3.normalize(vec3.subtract(camera.localPosition, lookAt));
    const u = vec3.normalize(vec3.cross(UP, w)); // Local right
    const v = vec3.cross(w, u); // Local up

    const viewportU = vec3.mulScalar(u, viewportWidth);
    const viewportV = vec3.mulScalar(vec3.negate(v), viewportHeight);

    const viewportDu = vec3.divScalar(viewportU, this.canvas.width);
    const viewportDv = vec3.divScalar(viewportV, this.canvas.height);

    const halfViewportU = vec3.divScalar(viewportU, 2);
    const halfViewportV = vec3.divScalar(viewportV, 2);

    // viewportUpperLeft = cameraPos - (w * focalLength) - U / 2 - V / 2
    const viewportUpperLeft = vec3.sub(
      vec3.sub(
        vec3.sub(camera.localPosition, vec3.mulScalar(w, focalLength)),
        halfViewportU
      ),
      halfViewportV
    );

    const pixelDuv = vec3.add(viewportDu, viewportDv);
    const halfPixelDuv = vec3.mulScalar(pixelDuv, 0.5);
    const viewportOrigin = vec3.add(viewportUpperLeft, halfPixelDuv);

    const viewportData = new Float32Array(9 + 3);

    viewportData.set(viewportOrigin, 0);
    viewportData.set(viewportDu, 4);
    viewportData.set(viewportDv, 8);

    this.device.queue.writeBuffer(this.viewportBuffer, 0, viewportData);

    const canvasTexture = this.context.getCurrentTexture();

    this.renderPassDescriptor.colorAttachments[0].view =
      canvasTexture.createView();

    this.bindGroup = this.device.createBindGroup({
      label: 'Ray tracer bind group',
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {buffer: this.resolutionBuffer},
        },
        {
          binding: 1,
          resource: {buffer: this.frameBuffer},
        },
        {
          binding: 2,
          resource: {buffer: this.frameNumberBuffer},
        },
        {
          binding: 3,
          resource: {buffer: this.cameraPositionBuffer},
        },
        {
          binding: 4,
          resource: {buffer: this.viewportBuffer},
        },
      ],
    });

    const encoder = this.device.createCommandEncoder();

    const computePass = encoder.beginComputePass();

    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.bindGroup);

    const workgroupCountX = Math.ceil(this.canvas.width / 8);
    const workgroupCountY = Math.ceil(this.canvas.height / 8);

    computePass.dispatchWorkgroups(workgroupCountX, workgroupCountY);

    computePass.end();

    const renderPass = encoder.beginRenderPass(this.renderPassDescriptor);

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.setBindGroup(0, this.bindGroup);

    renderPass.draw(6);
    renderPass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  updateCanvas() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    if (!this.resolutionBuffer) {
      throw new Error('Frame dimensions buffer has not been created.');
    }

    if (this.frameBuffer) {
      this.frameBuffer.destroy();
    }

    this.frameBuffer = this.device.createBuffer({
      label: 'Ray tracer frame buffer',
      size:
        4 *
        Float32Array.BYTES_PER_ELEMENT *
        this.canvas.width *
        this.canvas.height,
      usage: GPUBufferUsage.STORAGE,
    });

    // Update the frame dimensions buffer
    this.device.queue.writeBuffer(
      this.resolutionBuffer,
      0,
      new Uint32Array([this.canvas.width, this.canvas.height])
    );
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
          visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          buffer: {type: 'uniform'},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          buffer: {type: 'storage'},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          buffer: {type: 'uniform'},
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {type: 'uniform'},
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {type: 'uniform'},
        },
      ],
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

  private setComputePipeline() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    if (!this.bindGroupLayout) {
      throw new Error(
        'Bind group layout has not been set. Call .setBindGroup() first.'
      );
    }

    this.pipelineLayout = this.device.createPipelineLayout({
      label: 'Rasterizer pipeline layout',
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.computePipeline = this.device.createComputePipeline({
      label: 'Ray tracer compute pipeline',
      layout: this.pipelineLayout,
      compute: {
        module: this.device.createShaderModule({
          label: 'Ray tracer shader module',
          code: raytracerShader,
        }),
        entryPoint: 'computeMain',
      },
    });
  }

  private setRenderPipeline() {
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

    if (!this.pipelineLayout) {
      throw new Error(
        'Pipeline layout has not been set. Call .setComputePipeline() first.'
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

    const module = this.device.createShaderModule({
      code: randomShader + frameBufferViewShader,
    });

    this.renderPipeline = this.device.createRenderPipeline({
      label: 'Rasterizer pipeline',
      layout: this.pipelineLayout,
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
