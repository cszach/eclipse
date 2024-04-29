import { Geometry } from './Geometry.js';
declare class Sphere extends Geometry {
    readonly radius: number;
    readonly widthSegments: number;
    readonly heightSegments: number;
    constructor(radius: number, widthSegments?: number, heightSegments?: number);
}
export { Sphere };
