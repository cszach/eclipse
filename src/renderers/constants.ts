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

export {vertexBufferLayout};
