import {Geometry} from './Geometry.js';

class Plane extends Geometry {
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    super();

    this.width = width;
    this.height = height;

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // v1--v0
    //  |\  |    +Y
    //  | \ |     |
    //  |  \|     |---+X
    // v2--v3

    // prettier-ignore
    const vertices = new Float32Array([
       // v0
       halfWidth,  halfHeight, 0, // 0
      //  halfWidth,  halfHeight, 0, // 1

       // v1
      -halfWidth,  halfHeight, 0, // 2
      // -halfWidth,  halfHeight, 0, // 3

       // v2
      -halfWidth, -halfHeight, 0, // 4
      // -halfWidth, -halfHeight, 0, // 5

       // v3
       halfWidth, -halfHeight, 0, // 6
      //  halfWidth, -halfHeight, 0, // 7
    ]);

    // prettier-ignore
    const indices = new Uint32Array([
      // 0, 2, 6, 6, 2, 4, // +Z face
      // 1, 7, 3, 3, 7, 5, // -Z face
      0, 1, 3, 3, 1, 2
    ]);

    // prettier-ignore
    const vertexNormals = new Float32Array([
      // +Z face  -Z face
         0, 0, 1, /* 0, 0, -1, */ // v0
         0, 0, 1, /* 0, 0, -1, */ // v1
         0, 0, 1, /* 0, 0, -1, */ // v2
         0, 0, 1, /* 0, 0, -1, */ // v3
    ]);

    // prettier-ignore
    const uvs = new Float32Array([
      // X| Y
         1, 1, // v0
         0, 1, // v1
         0, 0, // v2
         1, 0, // v3
    ]);

    this.setVertices(vertices);
    this.setIndices(indices);
    this.setVertexNormals(vertexNormals);
    this.setUVs(uvs);
  }
}

export {Plane};
