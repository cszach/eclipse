import { Geometry } from './Geometry.js';
declare class Box extends Geometry {
    readonly width: number;
    readonly height: number;
    readonly depth: number;
    constructor(width: number, height: number, depth: number);
}
export { Box };
