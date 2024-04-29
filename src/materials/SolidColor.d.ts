import { Material } from './Material.js';
import { Vec3 } from 'wgpu-matrix';
declare class SolidColor extends Material {
    readonly type = 1;
    color: Vec3;
    constructor(color?: Vec3);
}
export { SolidColor };
