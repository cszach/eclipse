import { Material } from './Material.js';
import { Vec3 } from 'wgpu-matrix';
declare class Metal extends Material {
    readonly type = 4;
    color: Vec3;
    fuzziness: number;
    constructor(color: Vec3, fuzziness: number);
}
export { Metal };
