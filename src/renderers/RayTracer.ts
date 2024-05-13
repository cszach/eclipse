import {PerspectiveCamera} from '../cameras/exports.js';
import {Mesh, Scene} from '../primitives/exports.js';
import {Renderer} from './Renderer.js';
import {mat4, quat, vec3, Vec3} from 'wgpu-matrix';
import {UP} from '../constants.js';
import {
  BLINN_PHONG,
  SolidColor,
  BlinnPhong,
  METAL,
  Lambert,
  Metal,
} from '../materials/exports.js';
import {Light} from '../lights/exports.js';
import {ComputeStep} from './utils/ComputeStep.js';

// Shaders
import primitives from './shaders/primitives.wgsl';
import random from './shaders/random.wgsl';
import hlbvh from './shaders/hlbvh.wgsl';
import rayTracerShader from './shaders/ray_tracer.wgsl';
import frameBufferViewShader from './shaders/frame_buffer_view.wgsl';
import {rayTracingBindGroupLayoutDescriptor} from './constants.js';

class RayTracer implements Renderer {
  readonly canvas: HTMLCanvasElement;

  private initialized = false;
  private frameCount = 0;
  private _observeCanvasResize = true;
  private canvasResizeObserver: ResizeObserver;
  private animationFrame?: () => void;

  // GPU stuff
  private device?: GPUDevice;
  private context?: GPUCanvasContext;
  private format?: GPUTextureFormat;
  private renderPipeline?: GPURenderPipeline;

  // Compute shader buffers
  private frameBuffer?: GPUBuffer;
  private resolutionBuffer?: GPUBuffer;
  private frameCountBuffer?: GPUBuffer;
  private cameraPositionBuffer?: GPUBuffer;
  private viewportBuffer?: GPUBuffer;
  private materialBuffer?: GPUBuffer;
  private mortonCodesBuffer?: GPUBuffer;

  // Render shader buffers
  private frameBufferViewVertexBuffer?: GPUBuffer;
  private vertexBuffer?: GPUBuffer;
  private indexBuffer?: GPUBuffer;

  // Steps
  private sceneBoundingBoxComputeStep?: ComputeStep;
  private rayTracingStep?: ComputeStep;

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas ?? document.createElement('canvas');

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

  private async init(): Promise<void> {
    if (this.initialized) {
      console.warn('Renderer is already initiated.');
      return;
    }

    // Get WebGPU device

    if (!navigator.gpu) throw Error('WebGPU is not supported in this browser.');

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Error('Could not request WebGPU adapter.');

    const device = await adapter.requestDevice({
      requiredLimits: {
        maxStorageBufferBindingSize: 512 * 1024 * 1024, // 512 MB
      },
    });
    if (!device) throw Error('Could not request WebGPU logical device.');

    const {format} = this.setCanvasFormatAndContext(device);

    this.setSteps(device);
    this.setStaticBuffers(device);
    this.setVertexBuffer(device);
    this.setRenderPipeline(
      device,
      format,
      device.createPipelineLayout({
        label: 'Ray tracer render pipeline layout',
        bindGroupLayouts: [
          device.createBindGroupLayout(rayTracingBindGroupLayoutDescriptor),
        ],
      })
    );

    this.device = device;
    this.initialized = true;
    this.onCanvasResize(); // Create a new frame buffer
  }

  setRenderLoop(newRenderLoop: () => void) {
    const animationFrame = () => {
      newRenderLoop();
      window.requestAnimationFrame(animationFrame);
    };
    this.animationFrame = animationFrame;

    if (this.initialized) {
      window.requestAnimationFrame(animationFrame);
    }
  }

  render(scene: Scene, camera: PerspectiveCamera) {
    if (
      !this.cameraPositionBuffer ||
      !this.context ||
      !this.device ||
      !this.frameBuffer ||
      !this.frameBufferViewVertexBuffer ||
      !this.frameCountBuffer ||
      !this.renderPipeline ||
      !this.rayTracingStep ||
      !this.resolutionBuffer ||
      !this.viewportBuffer
    ) {
      throw new Error('Renderer has not been initialized properly.');
    }

    if (this._observeCanvasResize) {
      camera.aspectRatio = this.canvas.width / this.canvas.height;
    }

    this.device.queue.writeBuffer(
      this.frameCountBuffer,
      0,
      new Uint32Array([this.frameCount++])
    );

    this.device.queue.writeBuffer(
      this.cameraPositionBuffer,
      0,
      camera.localPosition // TODO: consider global position
    );

    // Get viewport data and write into the viewport buffer

    const {
      origin: viewportOrigin,
      du: viewportDu,
      dv: viewportDv,
    } = this.getViewportData(camera);
    const viewportData = new Float32Array(9 + 3);

    viewportData.set(viewportOrigin, 0);
    viewportData.set(viewportDu, 4);
    viewportData.set(viewportDv, 8);

    this.device.queue.writeBuffer(this.viewportBuffer, 0, viewportData);

    // Get scene data and write into buffers

    if (
      !this.vertexBuffer ||
      !this.indexBuffer ||
      !this.materialBuffer ||
      !this.mortonCodesBuffer ||
      scene.stats.outdated
    ) {
      const {vertexData, indexData, materialData} = this.getSceneData(scene);

      if (this.vertexBuffer) this.vertexBuffer.destroy();
      this.vertexBuffer = this.device.createBuffer({
        label: 'Ray tracer vertex buffer',
        size: vertexData.byteLength,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true,
      });
      new Float32Array(this.vertexBuffer.getMappedRange()).set(vertexData);
      this.vertexBuffer.unmap();

      if (this.indexBuffer) this.indexBuffer.destroy();
      this.indexBuffer = this.device.createBuffer({
        label: 'Ray tracer index buffer',
        size: indexData.byteLength,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true,
      });
      new Uint32Array(this.indexBuffer.getMappedRange()).set(indexData);
      this.indexBuffer.unmap();

      if (this.materialBuffer) this.materialBuffer.destroy();
      this.materialBuffer = this.device.createBuffer({
        label: 'Ray tracer material buffer',
        size: materialData.byteLength,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true,
      });
      new Float32Array(this.materialBuffer.getMappedRange()).set(materialData);
      this.materialBuffer.unmap();

      if (this.mortonCodesBuffer) this.mortonCodesBuffer.destroy();
      this.mortonCodesBuffer = this.device.createBuffer({
        label: 'Ray tracer morton codes buffer',
        size: scene.stats.triangles * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE,
      });
    }

    // Begin ray tracing process

    const rayTracingBindGroup = this.device.createBindGroup({
      label: 'Ray tracing bind group',
      layout: this.rayTracingStep.bindGroupLayouts[0],
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
          resource: {buffer: this.frameCountBuffer},
        },
        {
          binding: 3,
          resource: {buffer: this.cameraPositionBuffer},
        },
        {
          binding: 4,
          resource: {buffer: this.viewportBuffer},
        },
        {
          binding: 5,
          resource: {buffer: this.vertexBuffer},
        },
        {
          binding: 6,
          resource: {buffer: this.indexBuffer},
        },
        {
          binding: 7,
          resource: {buffer: this.materialBuffer},
        },
      ],
    });

    const encoder = this.device.createCommandEncoder();

    this.rayTracingStep.run(encoder, [rayTracingBindGroup]);

    const renderPass = encoder.beginRenderPass({
      label: 'Ray tracer render pass descriptor',
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: [0, 0, 0, 1],
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setVertexBuffer(0, this.frameBufferViewVertexBuffer);
    renderPass.setBindGroup(0, rayTracingBindGroup);

    renderPass.draw(6);
    renderPass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  onCanvasResize() {
    if (!this.device) {
      throw new Error('GPU device has not been set.');
    }

    if (!this.resolutionBuffer) {
      throw new Error('Resolution buffer has not been created.');
    }

    if (!this.rayTracingStep) {
      throw new Error('Ray tracing step has not been created');
    }

    if (this.frameBuffer) {
      this.frameBuffer.destroy();
    }

    this.frameBuffer = this.device.createBuffer({
      label: 'Ray tracer frame buffer',
      size:
        4 * // RGBA
        Float32Array.BYTES_PER_ELEMENT *
        this.canvas.width *
        this.canvas.height,
      usage: GPUBufferUsage.STORAGE,
    });

    // Update the resolution buffer
    this.device.queue.writeBuffer(
      this.resolutionBuffer,
      0,
      new Uint32Array([this.canvas.width, this.canvas.height])
    );

    this.frameCount = 0;

    // Update ray tracing step's workgroup count
    this.rayTracingStep.workgroupCount.x = Math.ceil(this.canvas.width / 8);
    this.rayTracingStep.workgroupCount.y = Math.ceil(this.canvas.height / 8);
  }

  private getSceneData(scene: Scene): {
    vertexData: Float32Array;
    indexData: Uint32Array;
    materialData: Float32Array;
    lightData: Float32Array;
  } {
    if (scene.stats.outdated) {
      scene.updateStats();
    }

    const vertexData = new Float32Array(scene.stats.vertices * 12);
    const indexData = new Uint32Array(scene.stats.triangles * 4);
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
            | Lambert
            | Metal;

          color = coloredMaterial.color;
        }

        if (mesh.material.type === BLINN_PHONG) {
          const blinnPhongMaterial = mesh.material as BlinnPhong;

          specular = blinnPhongMaterial.specular;
          shininess = blinnPhongMaterial.shininess;
        }

        if (mesh.material.type === METAL) {
          const metalMaterial = mesh.material as Metal;

          shininess = metalMaterial.fuzziness;
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
          indexData[indexDataOffset++] = 0; // Pad
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
          vertexData[vertexDataOffset++] = 0; // Pad
          vertexData[vertexDataOffset++] = transformedNormal[0];
          vertexData[vertexDataOffset++] = transformedNormal[1];
          vertexData[vertexDataOffset++] = transformedNormal[2];
          vertexData[vertexDataOffset++] = 0; // Pad
          vertexData[vertexDataOffset++] = uv[0];
          vertexData[vertexDataOffset++] = uv[1];
          vertexData[vertexDataOffset++] = materialIndex;
          vertexData[vertexDataOffset++] = 0; // Pad

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

  private getViewportData(camera: PerspectiveCamera): {
    origin: Vec3;
    du: Vec3;
    dv: Vec3;
  } {
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

    return {origin: viewportOrigin, du: viewportDu, dv: viewportDv};
  }

  private setSteps(device: GPUDevice) {
    this.rayTracingStep = new ComputeStep(
      'Ray tracing',
      device,
      [rayTracingBindGroupLayoutDescriptor],
      primitives + random + rayTracerShader,
      'ray_trace',
      {
        x: Math.ceil(this.canvas.width / 8),
        y: Math.ceil(this.canvas.height / 8),
      }
    );

    this.sceneBoundingBoxComputeStep = new ComputeStep(
      "Scene's bounding box computation",
      device,
      [rayTracingBindGroupLayoutDescriptor],
      primitives + hlbvh,
      'compute_scene_bounding_box',
      {
        x: 0, // update in render
      }
    );
  }

  private setStaticBuffers(device: GPUDevice) {
    this.resolutionBuffer = device.createBuffer({
      label: 'Ray tracer frame dimensions buffer',
      size: 2 * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.frameCountBuffer = device.createBuffer({
      label: 'Ray tracer frame count buffer',
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.cameraPositionBuffer = device.createBuffer({
      label: 'Ray tracer camera position buffer',
      size: 3 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.viewportBuffer = device.createBuffer({
      label: 'Ray tracer viewport buffer',
      size: (9 + 3) * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private setCanvasFormatAndContext(device: GPUDevice): {
    format: GPUTextureFormat;
    context: GPUCanvasContext;
  } {
    const context = this.canvas.getContext('webgpu');

    if (!context) {
      throw new Error('WebGPU context not found.');
    }

    this.context = context;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({device, format: this.format});

    return {
      format: this.format,
      context: this.context,
    };
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

  private setRenderPipeline(
    device: GPUDevice,
    format: GPUTextureFormat,
    pipelineLayout: GPUPipelineLayout
  ) {
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
      code: frameBufferViewShader,
    });

    this.renderPipeline = device.createRenderPipeline({
      label: 'Ray tracer pipeline',
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
}

export {RayTracer};
