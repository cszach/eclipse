import {Scene, Mesh} from '../primitives/exports.js';
import {PerspectiveCamera} from '../cameras/PerspectiveCamera.js';
import {Renderer} from './Renderer.js';
import {vec3, mat4, quat} from 'wgpu-matrix';
import shaderCode from '../shaders/rasterizer.wgsl';
import {UP} from '../constants.js';
import {vertexBufferLayout} from './constants.js';

class Rasterizer implements Renderer {
  readonly canvas: HTMLCanvasElement;

  // GPU stuff
  private device?: GPUDevice;
  private context?: GPUCanvasContext | null;
  private format?: GPUTextureFormat;
  private bindGroupLayout?: GPUBindGroupLayout;
  private bindGroup?: GPUBindGroup;
  private pipeline?: GPURenderPipeline;

  private uniformBuffer?: GPUBuffer;
  private vertexBuffer?: GPUBuffer;
  private indexBuffer?: GPUBuffer;
  private materialBuffer?: GPUBuffer;

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas ?? document.createElement('canvas');
  }

  async init(): Promise<void> {
    // Get WebGPU device

    if (!navigator.gpu) throw Error('WebGPU is not supported in this browser.');

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Error('Could not request WebGPU adapter.');

    const device = await adapter.requestDevice();
    if (!device) throw Error('Could not request WebGPU logical device.');

    this.device = device;

    this.setCanvasFormatAndContext();
    this.setBindGroup();
    this.setPipeline();
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    // FIXME: Find a way to make sure that init is always called and thus this
    // if statement redundant.
    if (
      !this.device ||
      !this.uniformBuffer ||
      !this.context ||
      !this.pipeline
    ) {
      throw Error('Renderer has not been initiated. Call .init() first.');
    }

    if (scene.stats.outdated) {
      scene.updateStats();
    }

    const {vertexData, indexData, materialData} = this.getSceneData(scene);

    // Write vertex and index data to GPU buffer

    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.device.createBuffer({
      label: 'Rasterizer vertex buffer',
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(vertexData);
    this.vertexBuffer.unmap();

    if (this.indexBuffer) this.indexBuffer.destroy();
    this.indexBuffer = this.device.createBuffer({
      label: 'Rasterizer index buffer',
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    });
    new Uint32Array(this.indexBuffer.getMappedRange()).set(indexData);
    this.indexBuffer.unmap();

    // Create the camera uniform buffer (model-view-projection matrix)

    const viewMatrix = mat4.lookAt(
      camera.localPosition,
      vec3.create(0, 0, 0),
      UP
    );

    const mvpMatrix = mat4.multiply(camera.projectionMatrix, viewMatrix);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, mvpMatrix);

    this.materialBuffer = this.device.createBuffer({
      label: 'Rasterizer material buffer',
      size: materialData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.materialBuffer, 0, materialData);

    this.bindGroup = this.device.createBindGroup({
      label: 'Rasterizer bind group',
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {buffer: this.uniformBuffer},
        },
        {
          binding: 1,
          resource: {buffer: this.materialBuffer},
        },
      ],
    });

    // Render pass

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: [0, 0, 0, 1],
          storeOp: 'store',
        },
      ],
    });

    pass.setPipeline(this.pipeline);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, 'uint32');
    pass.setBindGroup(0, this.bindGroup);

    pass.drawIndexed(indexData.length);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  private getSceneData(scene: Scene): {
    vertexData: Float32Array;
    indexData: Float32Array;
    materialData: Float32Array;
  } {
    const numComponents = 9; // Position X, Y, Z, normal X, Y, Z, U & V, matIdx
    const vertexData = new Float32Array(scene.stats.vertices * numComponents);
    const indexData = new Float32Array(scene.stats.triangles * 3);
    const materialData = new Float32Array(scene.stats.meshes * 3);

    let vertexDataOffset = 0;
    let indexDataOffset = 0;
    let materialDataOffset = 0;
    let materialIndex = 0;
    let numVerticesProcessed = 0;

    scene.traverse((group, globalPosition, globalRotation, globalScale) => {
      if (!(group instanceof Mesh)) {
        return;
      }

      const mesh = group;

      materialData[materialDataOffset++] = mesh.material.color[0];
      materialData[materialDataOffset++] = mesh.material.color[1];
      materialData[materialDataOffset++] = mesh.material.color[2];

      mesh.geometry.forEachTriangle((_index, indices) => {
        indexData[indexDataOffset++] = indices[0] + numVerticesProcessed;
        indexData[indexDataOffset++] = indices[1] + numVerticesProcessed;
        indexData[indexDataOffset++] = indices[2] + numVerticesProcessed;
      });

      const transformationMatrix = mat4.translation(globalPosition);
      const {angle, axis} = quat.toAxisAngle(globalRotation);
      mat4.rotate(transformationMatrix, axis, angle, transformationMatrix);
      mat4.scale(transformationMatrix, globalScale, transformationMatrix);

      mesh.geometry.forEachVertex((_index, position, normal, uv) => {
        const transformedPosition = vec3.transformMat4(
          position,
          transformationMatrix
        );

        vertexData[vertexDataOffset++] = transformedPosition[0];
        vertexData[vertexDataOffset++] = transformedPosition[1];
        vertexData[vertexDataOffset++] = transformedPosition[2];
        vertexData[vertexDataOffset++] = normal[0];
        vertexData[vertexDataOffset++] = normal[1];
        vertexData[vertexDataOffset++] = normal[2];
        vertexData[vertexDataOffset++] = uv[0];
        vertexData[vertexDataOffset++] = uv[1];
        vertexData[vertexDataOffset++] = materialIndex;

        numVerticesProcessed++;
      });

      materialIndex++;
    });

    return {vertexData, indexData, materialData};
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

  private setBindGroup() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    this.bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Rasterizer bind group layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {type: 'uniform'},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {type: 'read-only-storage'},
        },
      ],
    });

    this.uniformBuffer = this.device.createBuffer({
      label: 'Rasterizer uniform buffer',
      size: /*elements=*/ 16 * /*float32 size=*/ 4, // MVP matrix
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
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

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Rasterizer pipeline layout',
      bindGroupLayouts: [this.bindGroupLayout],
    });

    const module = this.device.createShaderModule({
      code: shaderCode,
    });

    this.pipeline = this.device.createRenderPipeline({
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
    });
  }
}

export {Rasterizer};
