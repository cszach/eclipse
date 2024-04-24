import {Group} from './Group.js';
import {Mesh} from './Mesh.js';

class Scene extends Group {
  stats: {
    outdated: boolean;
    meshes: number;
    vertices: number;
    triangles: number;
  };

  constructor() {
    super();

    this.stats = {
      outdated: false,
      meshes: 0,
      vertices: 0,
      triangles: 0,
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

    this.traverse(group => {
      if (group instanceof Mesh) {
        meshes++;
        vertices += group.geometry.vertexPositions.length / 3;
        triangles += group.geometry.indices.length / 3;
      }
    });

    this.stats = {meshes, vertices, triangles, outdated: false};
  }
}

export {Scene};
