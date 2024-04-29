import { Group } from './Group.js';
declare class Scene extends Group {
    stats: {
        outdated: boolean;
        meshes: number;
        vertices: number;
        triangles: number;
        lights: number;
    };
    constructor();
    add(...children: Group[]): void;
    updateStats(): void;
}
export { Scene };
