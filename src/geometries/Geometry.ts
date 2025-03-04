import {vec3, vec2, Vec3} from 'wgpu-matrix';

class Geometry {
  vertexPositions: Float32Array;
  vertexNormals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;

  constructor(
    vertices?: Float32Array,
    indices?: Uint32Array,
    vertexNormals?: Float32Array,
    uvs?: Float32Array
  ) {
    this.vertexPositions = vertices ?? new Float32Array();
    this.indices = indices ?? new Uint32Array();
    this.vertexNormals = vertexNormals ?? new Float32Array();
    this.uvs = uvs ?? new Float32Array();
  }

  setVertices(newVertexPositions: Float32Array): void {
    this.vertexPositions = newVertexPositions;
  }

  setIndices(newIndices: Uint32Array): void {
    this.indices = newIndices;
  }

  setVertexNormals(newVertexNormals: Float32Array): void {
    this.vertexNormals = newVertexNormals;
  }

  setUVs(newUVs: Float32Array): void {
    this.uvs = newUVs;
  }

  getNumVertices() {
    return this.vertexPositions.length / 3;
  }

  getNumTriangles() {
    return this.indices.length / 3;
  }

  forEachVertex(
    callback: (
      index: number,
      localPosition: vec3,
      normal: vec3,
      uv: vec2
    ) => void
  ) {
    for (let i = 0; i < this.vertexPositions.length / 3; i++) {
      callback(
        // index
        i,
        // local position
        vec3.create(
          this.vertexPositions[i * 3 + 0],
          this.vertexPositions[i * 3 + 1],
          this.vertexPositions[i * 3 + 2]
        ),
        // normal
        vec3.create(
          this.vertexNormals[i * 3 + 0],
          this.vertexNormals[i * 3 + 1],
          this.vertexNormals[i * 3 + 2]
        ),
        // uv
        vec2.create(this.uvs[i * 2 + 0], this.uvs[i * 2 + 1])
      );
    }
  }

  forEachTriangle(callback: (index: number, indices: Vec3) => void) {
    for (let i = 0; i < this.indices.length; i += 3) {
      callback(
        i / 3,
        vec3.create(
          this.indices[i + 0],
          this.indices[i + 1],
          this.indices[i + 2]
        )
      );
    }
  }
}

export {Geometry};
