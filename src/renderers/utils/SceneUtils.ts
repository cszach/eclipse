import {mat4, quat} from 'wgpu-matrix';
import {Scene} from '../../primitives/Scene.js';
import {Mesh} from '../../primitives/Mesh.js';
import {BLINN_PHONG, METAL} from '../../materials/constants.js';
import {BlinnPhong} from '../../materials/BlinnPhong.js';
import {Lambert} from '../../materials/Lambert.js';
import {Metal} from '../../materials/Metal.js';
import {SolidColor} from '../../materials/SolidColor.js';
import {Texture} from '../../textures/Texture.js';
import {MaxRectsPacker} from 'maxrects-packer';

type SceneData = {
  vertexData: Float32Array;
  indexData: Uint32Array;
  materialData: Float32Array;
  textureData: Float32Array;
  worldMatrixData: Float32Array;
  normalMatrixData: Float32Array;
  textures: Texture[];
};

class SceneUtils {
  static getData(scene: Scene, updateStats = false): SceneData {
    if (updateStats && scene.stats.isOutdated) {
      scene.updateStats();
    }

    const vertexData = new Float32Array(scene.stats.vertices * 12);
    const indexData = new Uint32Array(scene.stats.triangles * 4);
    const materialData = new Float32Array(scene.stats.meshes * 16);
    const textureData = new Float32Array(scene.stats.meshes * 4);
    const worldMatrixData = new Float32Array(scene.stats.meshes * 16);
    const normalMatrixData = new Float32Array(scene.stats.meshes * 16);

    let vertexIndex = 0;
    let indexIndex = 0;
    let materialIndex = 0;
    let matrixIndex = 0;

    const textures: Texture[] = [];
    const texturePacker = new MaxRectsPacker(4096, 4096, 0);

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
      let colorMap: Texture | undefined;
      let specular = [0, 0, 0];
      let shininess = 0;
      let colorMapIndex = -1;

      if (mesh.material.type < 5) {
        const coloredMaterial = mesh.material as
          | SolidColor
          | BlinnPhong
          | Lambert
          | Metal;

        color = coloredMaterial.color;
        colorMap = coloredMaterial.colorMap;

        if (colorMap) {
          colorMapIndex = textures.findIndex(texture => texture === colorMap);

          if (colorMapIndex === -1) {
            textures.push(colorMap);
            colorMapIndex = textures.length - 1;

            texturePacker.add({
              width: colorMap.width,
              height: colorMap.height,
              image: colorMap.image,
            });
          }
        }
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

      materialData[materialIndex * 16 + 0] = color[0];
      materialData[materialIndex * 16 + 1] = color[1];
      materialData[materialIndex * 16 + 2] = color[2];
      materialData[materialIndex * 16 + 3] = shininess;
      materialData[materialIndex * 16 + 4] = specular[0];
      materialData[materialIndex * 16 + 5] = specular[1];
      materialData[materialIndex * 16 + 6] = specular[2];
      materialData[materialIndex * 16 + 7] = colorMapIndex;
      materialData[materialIndex * 16 + 8] = mesh.material.type;
      materialData[materialIndex * 16 + 9] = 0; // Pad
      materialData[materialIndex * 16 + 10] = 0; // Pad
      materialData[materialIndex * 16 + 11] = 0; // Pad
      materialData[materialIndex * 16 + 12] = 0; // Pad
      materialData[materialIndex * 16 + 13] = 0; // Pad
      materialData[materialIndex * 16 + 14] = 0; // Pad
      materialData[materialIndex * 16 + 15] = 0; // Pad

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

    for (let i = 0; i < materialIndex; i++) {
      const colorMapIndex = materialData[i * 16 + 7];

      if (colorMapIndex !== -1 && texturePacker.bins[0]) {
        const colorMap = textures[colorMapIndex];
        const rect = texturePacker.bins[0].rects[colorMapIndex];

        materialData[i * 16 + 9] = colorMap.xOnAtlas = rect.x;
        materialData[i * 16 + 10] = colorMap.yOnAtlas = rect.y;
        materialData[i * 16 + 11] = colorMap.widthOnAtlas = rect.width;
        materialData[i * 16 + 12] = colorMap.heightOnAtlas = rect.height;
      }
    }

    return {
      vertexData,
      indexData,
      materialData,
      textureData,
      worldMatrixData,
      normalMatrixData,
      textures,
    };
  }
}

export {SceneUtils, SceneData};
