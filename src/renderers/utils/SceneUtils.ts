import {mat4, quat, vec3} from 'wgpu-matrix';
import {Group, Mesh, Scene} from '../../primitives/exports.js';
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

    let vertexDataOffset = 0;
    let indexDataOffset = 0;
    let materialDataOffset = 0;
    let materialIndex = 0;
    let worldMatrixIndex = 0;
    let numVerticesProcessed = 0;

    scene.traverse((group, globalPosition, globalRotation, globalScale) => {
      if (!(group instanceof Mesh)) {
        return;
      }

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

      mesh.geometry.forEachTriangle((_index, indices) => {
        indexData[indexDataOffset++] = indices[0] + numVerticesProcessed;
        indexData[indexDataOffset++] = indices[1] + numVerticesProcessed;
        indexData[indexDataOffset++] = indices[2] + numVerticesProcessed;
        indexData[indexDataOffset++] = worldMatrixIndex;
      });

      const worldMatrix = mat4.translation(globalPosition);
      const {angle, axis} = quat.toAxisAngle(globalRotation);
      mat4.rotate(worldMatrix, axis, angle, worldMatrix);
      mat4.scale(worldMatrix, globalScale, worldMatrix);

      const worldMatrixInverseTranspose = mat4.invert(worldMatrix);
      mat4.transpose(worldMatrixInverseTranspose, worldMatrixInverseTranspose);

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

      worldMatrixData.set(worldMatrix, worldMatrixIndex++ * 16);

      materialIndex++;
    });

    return {vertexData, indexData, materialData, worldMatrixData};
  }
}

export {SceneUtils, SceneData};
