import { Geometry } from '../geometries/Geometry.js';
import { Material } from '../materials/Material.js';
import { Group } from './Group.js';
declare class Mesh extends Group {
    geometry: Geometry;
    material: Material;
    constructor(geometry: Geometry, material: Material);
}
export { Mesh };
