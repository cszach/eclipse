import {Geometry} from './Geometry.js';

class Box extends Geometry {
  readonly width: number;
  readonly height: number;
  readonly depth: number;

  constructor(width: number, height: number, depth: number) {
    super();

    this.width = width;
    this.height = height;
    this.depth = depth;

    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfDepth = depth / 2;

    //   v2-------v3
    //   /|       /|
    // v1-------v0 |    +Y
    //  | |      | |     |
    //  |v6------|v7     |---+X
    //  |/       |/     /
    // v5-------v4    +Z

    // For correct shading of a cube, each vertex needs to be duplicated twice,
    // resulting in 3 copies. Each copy will have its own vertex normal pointing
    // along different axes (in the order of X, Y, and then Z).
    // prettier-ignore
    const vertices = new Float32Array([
       // v0
       halfWidth,  halfHeight,  halfDepth, // 0 X face
       halfWidth,  halfHeight,  halfDepth, // 1 Y face
       halfWidth,  halfHeight,  halfDepth, // 2 Z face

       // v1
      -halfWidth,  halfHeight,  halfDepth, // 3
      -halfWidth,  halfHeight,  halfDepth, // 4
      -halfWidth,  halfHeight,  halfDepth, // 5

       // v2
      -halfWidth,  halfHeight, -halfDepth, // 6
      -halfWidth,  halfHeight, -halfDepth, // 7
      -halfWidth,  halfHeight, -halfDepth, // 8

       // v3
       halfWidth,  halfHeight, -halfDepth, // 9
       halfWidth,  halfHeight, -halfDepth, // 10
       halfWidth,  halfHeight, -halfDepth, // 11

       // v4
       halfWidth, -halfHeight,  halfDepth, // 12
       halfWidth, -halfHeight,  halfDepth, // 13
       halfWidth, -halfHeight,  halfDepth, // 14

       // v5
      -halfWidth, -halfHeight,  halfDepth, // 15
      -halfWidth, -halfHeight,  halfDepth, // 16
      -halfWidth, -halfHeight,  halfDepth, // 17

       // v6
      -halfWidth, -halfHeight, -halfDepth, // 18
      -halfWidth, -halfHeight, -halfDepth, // 19
      -halfWidth, -halfHeight, -halfDepth, // 20

       // v7
       halfWidth, -halfHeight, -halfDepth, // 21
       halfWidth, -halfHeight, -halfDepth, // 22
       halfWidth, -halfHeight, -halfDepth, // 23
    ]);

    // 3 consecutive entries in the index buffer define a triangle. Each index
    // points to a vertex stored in the vertex data above. The index for the X
    // face must point to a vertex in the X face, and so on. In addition, keep
    // in mind that front-facing faces need to have their vertices listed
    // counter-clockwise, and we are culling (not drawing) back-facing
    // triangles. This means that based on the cube diagram above, triangles for
    // the +X, +Y, and +Z need to have their vertices listed counter-clockwise,
    // and the -X, -Y, and -Z clockwise.
    // prettier-ignore
    const indices = new Uint32Array([
       0, 12, 21, 21,  9,  0, // +X face
       1, 10,  7,  7,  4,  1, // +Y face
       2,  5, 14, 14,  5, 17, // +Z face
       3,  6, 18, 18, 15,  3, // -X face
      16, 19, 13, 13, 19, 22, // -Y face
       8, 11, 20, 20, 11, 23, // -Z face
    ]);

    // prettier-ignore
    const vertexNormals = new Float32Array([
      //X normal  Y normal  Z normal
         1, 0, 0, 0,  1, 0, 0, 0,  1, // v0
        -1, 0, 0, 0,  1, 0, 0, 0,  1, // v1
        -1, 0, 0, 0,  1, 0, 0, 0, -1, // v2
         1, 0, 0, 0,  1, 0, 0, 0, -1, // v3
         1, 0, 0, 0, -1, 0, 0, 0,  1, // v4
        -1, 0, 0, 0, -1, 0, 0, 0,  1, // v5
        -1, 0, 0, 0, -1, 0, 0, 0, -1, // v6
         1, 0, 0, 0, -1, 0, 0, 0, -1, // v7
    ]);

    // prettier-ignore
    const uvs = new Float32Array([
    //   X|    Y|    Z|
      0, 1, 1, 0, 1, 1, // v0
      1, 1, 0, 0, 0, 1, // v1
      0, 1, 0, 1, 1, 1, // v2
      1, 1, 1, 1, 0, 1, // v3
      0, 0, 1, 1, 1, 0, // v4
      1, 0, 0, 1, 0, 0, // v5
      0, 0, 0, 0, 1, 0, // v6
      1, 0, 0, 1, 0, 0, // v7
    ]);

    this.setVertices(vertices);
    this.setIndices(indices);
    this.setVertexNormals(vertexNormals);
    this.setUVs(uvs);
  }
}

export {Box};
