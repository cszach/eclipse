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

const hlbvhConstructionBindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor =
  {
    label: 'HLBVH construction bind group layout',
    entries: [
      {
        // Scene's AABB
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {type: 'storage'},
      },
      // {
      //   // Morton codes
      //   binding: 1,
      //   visibility: GPUShaderStage.COMPUTE,
      //   buffer: {type: 'storage'},
      // },
    ],
  };

/**
 * The bind group that can be shared among ray/path tracers. Contains
 * information about the frame, camera position, viewport, geometries, and
 * materials.
 */
const rayTracingBindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor = {
  label: 'Ray tracing bind group layout',
  entries: [
    {
      // Frame dimensions
      binding: 0,
      visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
      buffer: {type: 'uniform'},
    },
    {
      // Frame buffer
      binding: 1,
      visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
      buffer: {type: 'storage'},
    },
    {
      // Frame
      binding: 2,
      visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
      buffer: {type: 'uniform'},
    },
    {
      // Camera position
      binding: 3,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'uniform'},
    },
    {
      // Viewport
      binding: 4,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'uniform'},
    },
    {
      // Vertices
      binding: 5,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'read-only-storage'},
    },
    {
      // Faces
      binding: 6,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'read-only-storage'},
    },
    {
      // Materials
      binding: 7,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'read-only-storage'},
    },
    {
      // BVH
      binding: 8,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'},
    },
  ],
};

export {
  vertexBufferLayout,
  hlbvhConstructionBindGroupLayoutDescriptor,
  rayTracingBindGroupLayoutDescriptor,
};
