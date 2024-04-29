import { Light } from './Light.js';
import { Vec3 } from 'wgpu-matrix';
declare class AmbientLight extends Light {
    readonly type: number;
    constructor(color?: Vec3, intensity?: number);
}
export { AmbientLight };
