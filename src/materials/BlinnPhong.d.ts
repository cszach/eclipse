import { Material } from './Material.js';
import { Vec3 } from 'wgpu-matrix';
declare class BlinnPhong extends Material {
    readonly type = 2;
    color: Vec3;
    specular: Vec3;
    shininess: number;
    constructor(color?: Vec3, specular?: Vec3, shininess?: number);
}
export { BlinnPhong };
