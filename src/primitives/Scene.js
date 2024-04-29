import { Light } from '../lights/Light.js';
import { Group } from './Group.js';
import { Mesh } from './Mesh.js';
class Scene extends Group {
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
    add(...children) {
        this.children.push(...children);
        this.stats.outdated = true;
    }
    updateStats() {
        let meshes = 0;
        let vertices = 0;
        let triangles = 0;
        let lights = 0;
        this.traverse(group => {
            if (group instanceof Mesh) {
                meshes++;
                vertices += group.geometry.vertexPositions.length / 3;
                triangles += group.geometry.indices.length / 3;
            }
            else if (group instanceof Light) {
                lights++;
            }
        });
        this.stats = { meshes, vertices, triangles, lights, outdated: false };
    }
}
export { Scene };
//# sourceMappingURL=Scene.js.map