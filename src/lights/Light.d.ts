import { Vec3 } from 'wgpu-matrix';
import { Object3D } from '../primitives/Group.js';
declare abstract class Light extends Object3D {
    readonly type: number;
    color: Vec3;
    intensity: number;
    constructor(color: Vec3, intensity: number);
}
export { Light };
