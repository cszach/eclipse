import {Group} from './Group.js';
import {Mesh} from './Mesh.js';

class Scene extends Group {
  stats: {
    outdated: boolean;
    vertices: number;
    triangles: number;
  };

  constructor() {
    super();

    this.stats = {
      outdated: false,
      vertices: 0,
      triangles: 0,
    };
  }

  override add(...children: Group[]) {
    this.children.push(...children);
    this.stats.outdated = true;
  }

  updateStats(): void {
    let verticesCount = 0;
    let trianglesCount = 0;

    this.traverse(group => {
      if (group instanceof Mesh) {
        verticesCount += group.geometry.vertexPositions.length / 3;
        trianglesCount += group.geometry.indices.length / 3;
      }
    });

    this.stats.vertices = verticesCount;
    this.stats.triangles = trianglesCount;
    this.stats.outdated = false;
  }
}

export {Scene};
