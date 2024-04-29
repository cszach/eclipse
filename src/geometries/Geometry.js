import { vec3, vec2 } from 'wgpu-matrix';
class Geometry {
    constructor(vertices, indices, vertexNormals, uvs) {
        this.vertexPositions = vertices !== null && vertices !== void 0 ? vertices : new Float32Array();
        this.indices = indices !== null && indices !== void 0 ? indices : new Uint32Array();
        this.vertexNormals = vertexNormals !== null && vertexNormals !== void 0 ? vertexNormals : new Float32Array();
        this.uvs = uvs !== null && uvs !== void 0 ? uvs : new Float32Array();
    }
    setVertices(newVertexPositions) {
        this.vertexPositions = newVertexPositions;
    }
    setIndices(newIndices) {
        this.indices = newIndices;
    }
    setVertexNormals(newVertexNormals) {
        this.vertexNormals = newVertexNormals;
    }
    setUVs(newUVs) {
        this.uvs = newUVs;
    }
    getNumVertices() {
        return this.vertexPositions.length / 3;
    }
    getNumTriangles() {
        return this.indices.length / 3;
    }
    forEachVertex(callback) {
        for (let i = 0; i < this.vertexPositions.length; i += 3) {
            callback(
            // index
            i / 3, 
            // local position
            vec3.create(this.vertexPositions[i + 0], this.vertexPositions[i + 1], this.vertexPositions[i + 2]), 
            // normal
            vec3.create(this.vertexNormals[i + 0], this.vertexNormals[i + 1], this.vertexNormals[i + 2]), 
            // uv
            vec2.create(this.uvs[i], this.uvs[i + 1]));
        }
    }
    forEachTriangle(callback) {
        for (let i = 0; i < this.indices.length; i += 3) {
            callback(i / 3, vec3.create(this.indices[i + 0], this.indices[i + 1], this.indices[i + 2]));
        }
    }
}
export { Geometry };
//# sourceMappingURL=Geometry.js.map