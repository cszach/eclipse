import {mat4, quat} from 'wgpu-matrix';
import {Mesh, Scene} from '../../primitives/exports.js';
import {
  BLINN_PHONG,
  BlinnPhong,
  Lambert,
  Metal,
  METAL,
  SolidColor,
} from '../../materials/exports.js';
import {Capacities} from '../exports.js';

type SceneData = {
  vertexData: Float32Array;
  indexData: Uint32Array;
  materialData: Float32Array;
  worldMatrixData: Float32Array;
  normalMatrixData: Float32Array;
};

class SceneUtils {
  static getData(
    scene: Scene,
    capacities: Capacities,
    updateStats = false
  ): SceneData {
    if (updateStats && scene.stats.isOutdated) {
      scene.updateStats();
    }

    const vertexData = new Float32Array(scene.stats.vertices * 12);
    const indexData = new Uint32Array(scene.stats.triangles * 4);
    const materialData = new Float32Array(scene.stats.meshes * 8);
    const worldMatrixData = new Float32Array(scene.stats.meshes * 16);
    const normalMatrixData = new Float32Array(scene.stats.meshes * 16);

    let vertexIndex = 0;
    let indexIndex = 0;
    let materialIndex = 0;
    let matrixIndex = 0;

    scene.traverse((group, globalPosition, globalRotation, globalScale) => {
      if (!(group instanceof Mesh)) {
        return;
      }

      const mesh = group;

      mesh.geometry.forEachTriangle((_index, indices) => {
        indexData[indexIndex * 4 + 0] = indices[0] + vertexIndex;
        indexData[indexIndex * 4 + 1] = indices[1] + vertexIndex;
        indexData[indexIndex * 4 + 2] = indices[2] + vertexIndex;
        indexData[indexIndex * 4 + 3] = matrixIndex;

        indexIndex++;
      });

      mesh.geometry.forEachVertex((_index, position, normal, uv) => {
        vertexData[vertexIndex * 12 + 0] = position[0];
        vertexData[vertexIndex * 12 + 1] = position[1];
        vertexData[vertexIndex * 12 + 2] = position[2];
        vertexData[vertexIndex * 12 + 3] = 0; // Pad
        vertexData[vertexIndex * 12 + 4] = normal[0];
        vertexData[vertexIndex * 12 + 5] = normal[1];
        vertexData[vertexIndex * 12 + 6] = normal[2];
        vertexData[vertexIndex * 12 + 7] = 0; // Pad
        vertexData[vertexIndex * 12 + 8] = uv[0];
        vertexData[vertexIndex * 12 + 9] = uv[1];
        vertexData[vertexIndex * 12 + 10] = materialIndex;
        vertexData[vertexIndex * 12 + 11] = 0; // Pad

        vertexIndex++;
      });

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

      materialData[materialIndex * 8 + 0] = color[0];
      materialData[materialIndex * 8 + 1] = color[1];
      materialData[materialIndex * 8 + 2] = color[2];
      materialData[materialIndex * 8 + 3] = shininess;
      materialData[materialIndex * 8 + 4] = specular[0];
      materialData[materialIndex * 8 + 5] = specular[1];
      materialData[materialIndex * 8 + 6] = specular[2];
      materialData[materialIndex * 8 + 7] = mesh.material.type;

      materialIndex++;

      // World & normal matrices

      const worldMatrix = mat4.translation(globalPosition);
      const {angle, axis} = quat.toAxisAngle(globalRotation);
      mat4.rotate(worldMatrix, axis, angle, worldMatrix);
      mat4.scale(worldMatrix, globalScale, worldMatrix);

      const normalMatrix = mat4.invert(worldMatrix);
      mat4.transpose(normalMatrix, normalMatrix);

      worldMatrixData.set(worldMatrix, matrixIndex * 16);
      normalMatrixData.set(normalMatrix, matrixIndex * 16);

      matrixIndex++;
    });

    return {
      vertexData,
      indexData,
      materialData,
      worldMatrixData,
      normalMatrixData,
    };
  }
}

export {SceneUtils, SceneData};
