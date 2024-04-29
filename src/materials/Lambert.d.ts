import { Material } from './Material.js';
import { Vec3 } from 'wgpu-matrix';
declare class Lambert extends Material {
    readonly type = 3;
    color: Vec3;
    constructor(color: Vec3);
}
export { Lambert };
