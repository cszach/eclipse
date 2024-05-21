import {Light} from '../lights/Light.js';
import {Group} from './Group.js';
import {Mesh} from './Mesh.js';

type SceneStats = {
  outdated: boolean;
  meshes: number;
  vertices: number;
  triangles: number;
  lights: number;
};

class Scene extends Group {
  stats: SceneStats;

  constructor() {
    super();

    this.stats = {
      outdated: false,
      meshes: 0,
      vertices: 0,
      triangles: 0,
      lights: 0,
    };
  }

  override add(...children: Group[]) {
    this.children.push(...children);
    this.stats.outdated = true;
  }

  updateStats(): void {
    let meshes = 0;
    let vertices = 0;
    let triangles = 0;
    let lights = 0;

    this.traverse(group => {
      if (group instanceof Mesh) {
        meshes++;
        vertices += group.geometry.vertexPositions.length / 3;
        triangles += group.geometry.indices.length / 3;
      } else if (group instanceof Light) {
        lights++;
      }
    });

    this.stats = {meshes, vertices, triangles, lights, outdated: false};
  }
}

export {Scene, SceneStats};
