import { Light } from './Light.js';
declare class PointLight extends Light {
    readonly type = 2;
    constructor(color?: any, intensity?: number);
}
export { PointLight };
