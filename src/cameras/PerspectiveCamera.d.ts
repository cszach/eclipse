import { Group } from '../primitives/Group.js';
import { Camera } from './Camera.js';
import { mat4 } from 'wgpu-matrix';
declare class PerspectiveCamera extends Group implements Camera {
    projectionMatrix: mat4;
    projectionMatrixInverse: mat4;
    private _verticalFovRadians;
    private _aspectRatio;
    private _near;
    private _far;
    constructor(verticalFovRadians?: number, aspectRatio?: number, near?: number, far?: number);
    get verticalFovRadians(): number;
    set verticalFovRadians(newVerticalFovRadians: number);
    get aspectRatio(): number;
    set aspectRatio(newAspectRatio: number);
    get near(): number;
    set near(newNear: number);
    get far(): number;
    set far(newFar: number);
    private updateProjectMatrix;
}
export { PerspectiveCamera };
