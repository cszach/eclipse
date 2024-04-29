import { Geometry } from './Geometry.js';
declare class Plane extends Geometry {
    readonly width: number;
    readonly height: number;
    constructor(width: number, height: number);
}
export { Plane };
