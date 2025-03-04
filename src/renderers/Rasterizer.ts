import {Scene} from '../primitives/Scene.js';
import {Mesh} from '../primitives/Mesh.js';
import {PerspectiveCamera} from '../cameras/PerspectiveCamera.js';
import {UP} from '../constants.js';
import {Light} from '../lights/Light.js';
import {Renderer} from './Renderer.js';

// Shaders
import solidColorShader from '../materials/shaders/solid_color.wgsl';
import blinnPhongShader from '../materials/shaders/blinn_phong.wgsl';
import rasterizerShader from './shaders/rasterizer.wgsl';

// External
import {vec3, mat4, quat} from 'wgpu-matrix';
import {BLINN_PHONG, SOLID_COLOR} from '../materials/constants.js';
import {BlinnPhong} from '../materials/BlinnPhong.js';
import {SolidColor} from '../materials/SolidColor.js';
import {Metal} from '../materials/Metal.js';

class Rasterizer implements Renderer {
  readonly canvas: HTMLCanvasElement;

  // GPU stuff
  private device?: GPUDevice;
  private context?: GPUCanvasContext | null;
  private format?: GPUTextureFormat;
  private depthTexture?: GPUTexture;
  private renderPassDescriptor?: GPURenderPassDescriptor;
  private bindGroupLayout?: GPUBindGroupLayout;
  private bindGroup?: GPUBindGroup;
  private pipeline?: GPURenderPipeline;

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

    const device = await adapter.requestDevice();
    if (!device) throw Error('Could not request WebGPU logical device.');

    this.device = device;

    this.setCanvasFormatAndContext();
    this.setDepthTexture();
    this.setRenderPassDescriptor();
    this.setBindGroup();
    this.setPipeline();
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    // FIXME: Find a way to make sure that init is always called and thus this
    // if statement redundant.
    if (
      !this.device ||
      !this.depthTexture ||
      !this.renderPassDescriptor ||
      !this.viewProjectionMatrixBuffer ||
      !this.cameraPositionBuffer ||
      !this.context ||
      !this.pipeline
    ) {
      throw Error('Renderer has not been initiated. Call .init() first.');
    }

    const canvasTexture = this.context.getCurrentTexture();

    // @ts-ignore
    this.renderPassDescriptor.colorAttachments[0].view =
      canvasTexture.createView();

    if (
      this.depthTexture.width !== canvasTexture.width ||
      this.depthTexture.height !== canvasTexture.height
    ) {
      this.depthTexture.destroy();

      this.depthTexture = this.device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      // @ts-ignore
      this.renderPassDescriptor.depthStencilAttachment.view =
        this.depthTexture.createView();
    }

    if (scene.stats.isOutdated) {
      scene.updateStats();
    }

    const {vertexData, indexData, materialData, lightData} =
      this.getSceneData(scene);

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

    // Create the camera uniform buffer (view projection matrix)

    const transformedCameraPosition = vec3.transformMat4(
      [0, 0, 0],
      mat4.translation(camera.localPosition)
    );

    const viewMatrix = mat4.lookAt(
      transformedCameraPosition,
      vec3.create(0, 0, 0),
      UP
    );

    const viewProjectionMatrix = mat4.multiply(
      camera.projectionMatrix,
      viewMatrix
    );
    this.device.queue.writeBuffer(
      this.viewProjectionMatrixBuffer,
      0,
      viewProjectionMatrix
    );

    this.device.queue.writeBuffer(
      this.cameraPositionBuffer,
      0,
      transformedCameraPosition
    );

    // Create the material buffer

    this.materialBuffer = this.device.createBuffer({
      label: 'Rasterizer material buffer',
      size: materialData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.materialBuffer, 0, materialData);

    // Create the light buffer
    this.lightBuffer = this.device.createBuffer({
      label: 'Rasterizer light buffer',
      size: lightData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.lightBuffer, 0, lightData);

    this.bindGroup = this.device.createBindGroup({
      label: 'Rasterizer bind group',
      layout: this.bindGroupLayout as GPUBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {buffer: this.viewProjectionMatrixBuffer},
        },
        {
          binding: 1,
          resource: {buffer: this.cameraPositionBuffer},
        },
        {
          binding: 2,
          resource: {buffer: this.materialBuffer},
        },
        {
          binding: 3,
          resource: {buffer: this.lightBuffer},
        },
      ],
    });

    // Render pass

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass(this.renderPassDescriptor);

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
    lightData: Float32Array;
  } {
    const numComponents = 9; // Position X, Y, Z, normal X, Y, Z, U & V, matIdx
    const vertexData = new Float32Array(scene.stats.vertices * numComponents);
    const indexData = new Float32Array(scene.stats.triangles * 3);
    const materialData = new Float32Array(scene.stats.meshes * 8);
    const lightData = new Float32Array(scene.stats.lights * 8);

    let vertexDataOffset = 0;
    let indexDataOffset = 0;
    let materialDataOffset = 0;
    let materialIndex = 0;
    let lightDataOffset = 0;
    let numVerticesProcessed = 0;

    scene.traverse((group, globalPosition, globalRotation, globalScale) => {
      const worldMatrix = mat4.translation(globalPosition);
      const {angle, axis} = quat.toAxisAngle(globalRotation);
      mat4.rotate(worldMatrix, axis, angle, worldMatrix);
      mat4.scale(worldMatrix, globalScale, worldMatrix);

      const worldMatrixInverseTranspose = mat4.invert(worldMatrix);
      mat4.transpose(worldMatrixInverseTranspose, worldMatrixInverseTranspose);

      if (group instanceof Mesh) {
        const mesh = group;

        // Material

        let color = [0, 0, 0];
        let specular = [0, 0, 0];
        let shininess = 0;

        if (mesh.material.type < 5) {
          const coloredMaterial = mesh.material as
            | SolidColor
            | BlinnPhong
            | Metal;

          color = coloredMaterial.color;
        }

        if (mesh.material.type === BLINN_PHONG) {
          const blinnPhongMaterial = mesh.material as BlinnPhong;

          specular = blinnPhongMaterial.specular;
          shininess = blinnPhongMaterial.shininess;
        }

        materialData[materialDataOffset++] = color[0];
        materialData[materialDataOffset++] = color[1];
        materialData[materialDataOffset++] = color[2];
        materialData[materialDataOffset++] = shininess;
        materialData[materialDataOffset++] = specular[0];
        materialData[materialDataOffset++] = specular[1];
        materialData[materialDataOffset++] = specular[2];
        materialData[materialDataOffset++] = mesh.material.type;

        // Vertices

        mesh.geometry.forEachTriangle((_index, indices) => {
          indexData[indexDataOffset++] = indices[0] + numVerticesProcessed;
          indexData[indexDataOffset++] = indices[1] + numVerticesProcessed;
          indexData[indexDataOffset++] = indices[2] + numVerticesProcessed;
        });

        mesh.geometry.forEachVertex((_index, position, normal, uv) => {
          const transformedPosition = vec3.transformMat4(position, worldMatrix);

          const transformedNormal = vec3.transformMat4(
            normal,
            worldMatrixInverseTranspose
          );

          vertexData[vertexDataOffset++] = transformedPosition[0];
          vertexData[vertexDataOffset++] = transformedPosition[1];
          vertexData[vertexDataOffset++] = transformedPosition[2];
          vertexData[vertexDataOffset++] = transformedNormal[0];
          vertexData[vertexDataOffset++] = transformedNormal[1];
          vertexData[vertexDataOffset++] = transformedNormal[2];
          vertexData[vertexDataOffset++] = uv[0];
          vertexData[vertexDataOffset++] = uv[1];
          vertexData[vertexDataOffset++] = materialIndex;

          numVerticesProcessed++;
        });

        materialIndex++;
      }

      // Light
      if (group instanceof Light) {
        const light = group;

        const transformedLightPosition = vec3.transformMat4(
          [0, 0, 0],
          worldMatrix
        );

        lightData[lightDataOffset++] = transformedLightPosition[0]; // 0
        lightData[lightDataOffset++] = transformedLightPosition[1];
        lightData[lightDataOffset++] = transformedLightPosition[2];
        lightData[lightDataOffset++] = light.intensity;
        lightData[lightDataOffset++] = light.color[0]; // 16
        lightData[lightDataOffset++] = light.color[1];
        lightData[lightDataOffset++] = light.color[2];
        lightData[lightDataOffset++] = light.type;
      }
    });

    return {vertexData, indexData, materialData, lightData};
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

  private setDepthTexture() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    if (!this.context) {
      throw new Error(
        'Canvas context has not been set. Call .setCanvasFormatAndContext() first.'
      );
    }

    const canvasTexture = this.context.getCurrentTexture();
    this.depthTexture = this.device.createTexture({
      size: [canvasTexture.width, canvasTexture.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
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

    if (!this.depthTexture) {
      throw new Error(
        'Depth texture has not been set. Call .setDepthTexture() first.'
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
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
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
          visibility: GPUShaderStage.VERTEX,
          buffer: {type: 'uniform'},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {type: 'uniform'},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {type: 'read-only-storage'},
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {type: 'read-only-storage'},
        },
      ],
    });

    this.viewProjectionMatrixBuffer = this.device.createBuffer({
      label: 'Rasterizer view projection matrix buffer',
      size: /*elements=*/ 16 * /*float32 size=*/ 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.cameraPositionBuffer = this.device.createBuffer({
      label: 'Rasterizer camera position buffer',
      size: /*elements=*/ 3 * /*float32 size=*/ 4,
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
      code: solidColorShader + blinnPhongShader + rasterizerShader,
    });

    // The vertex buffer layout
    //
    //  Data: | Position X| Position Y| Position Z|
    // Bytes: | 0| 1| 2| 3| 4| 5| 6| 7| 8| 9|10|11|…
    //        |   Normal X|   Normal Y|   Normal Z|
    //        |12|13|14|15|16|17|18|19|20|21|22|23|…
    //        |          U|          V|MaterialIdx|
    //        |24|25|26|27|28|29|30|31|32|33|34|35|
    const vertexBufferLayout: GPUVertexBufferLayout = {
      arrayStride: 9 * 4,
      attributes: [
        {
          // position
          format: 'float32x3',
          offset: 0,
          shaderLocation: 1,
        },
        {
          // vertex normals
          format: 'float32x3',
          offset: 12,
          shaderLocation: 2,
        },
        {
          // UV
          format: 'float32x2',
          offset: 24,
          shaderLocation: 3,
        },
        {
          // material index
          format: 'float32',
          offset: 32,
          shaderLocation: 4,
        },
      ],
    };

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
      primitive: {
        topology: 'triangle-list',
        frontFace: 'ccw',
        cullMode: 'back',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });
  }
}

export {Rasterizer};
