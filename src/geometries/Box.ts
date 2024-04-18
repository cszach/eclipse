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
    // v1-------v0 |     +Y
    //  | |      | |      |
    //  |v6------|v7      |___+X
    //  |/       |/      /
    // v5-------v4     +Z

    // For correct shading of a cube, each vertex needs to be duplicated twice,
    // resulting in 3 copies. Each copy will have its own vertex normal pointing
    // along different axes (in the order of X, Y, and then Z).
    // prettier-ignore
    const vertices = new Float32Array([
       // v0
       halfWidth,  halfHeight,  halfDepth, // 0
       halfWidth,  halfHeight,  halfDepth, // 1
       halfWidth,  halfHeight,  halfDepth, // 2

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
    // points to a vertex stored in the vertex data above. Each index has the
    // expression B * 3 + O, where B is the base index (e.g. v0-v7 in the box
    // diagram above) and O is the offset (0 if the triangle is for a face
    // facing along the X axis, 1 for Y, and 2 for Z). The term B is multiplied
    // by 3 because there are 3 copies for each vertex.
    // prettier-ignore
    const indices = new Uint32Array([
      0 * 3 + 0, 3 * 3 + 0, 7 * 3 + 0, 7 * 3 + 0, 4 * 3 + 0, 0 * 3 + 0, // +X face
      2 * 3 + 1, 3 * 3 + 1, 0 * 3 + 1, 0 * 3 + 1, 1 * 3 + 1, 2 * 3 + 1, // +Y face
      1 * 3 + 2, 0 * 3 + 2, 4 * 3 + 2, 4 * 3 + 2, 5 * 3 + 2, 1 * 3 + 2, // +Z face
      2 * 3 + 0, 1 * 3 + 0, 5 * 3 + 0, 5 * 3 + 0, 6 * 3 + 0, 2 * 3 + 0, // -X face
      5 * 3 + 1, 4 * 3 + 1, 7 * 3 + 1, 7 * 3 + 1, 6 * 3 + 1, 5 * 3 + 1, // -Y face
      3 * 3 + 2, 2 * 3 + 2, 6 * 3 + 2, 6 * 3 + 2, 7 * 3 + 2, 3 * 3 + 2, // -Z face
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

    this.setVertices(vertices);
    this.setIndices(indices);
    this.setVertexNormals(vertexNormals);
  }
}

export {Box};
