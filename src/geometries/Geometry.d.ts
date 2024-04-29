import { vec3, vec2, Vec3 } from 'wgpu-matrix';
declare class Geometry {
    vertexPositions: Float32Array;
    vertexNormals: Float32Array;
    uvs: Float32Array;
    indices: Uint32Array;
    constructor(vertices?: Float32Array, indices?: Uint32Array, vertexNormals?: Float32Array, uvs?: Float32Array);
    setVertices(newVertexPositions: Float32Array): void;
    setIndices(newIndices: Uint32Array): void;
    setVertexNormals(newVertexNormals: Float32Array): void;
    setUVs(newUVs: Float32Array): void;
    getNumVertices(): number;
    getNumTriangles(): number;
    forEachVertex(callback: (index: number, localPosition: vec3, normal: vec3, uv: vec2) => void): void;
    forEachTriangle(callback: (index: number, indices: Vec3) => void): void;
}
export { Geometry };
