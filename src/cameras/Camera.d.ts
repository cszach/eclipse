import { mat4 } from 'wgpu-matrix';
interface Camera {
    projectionMatrix: mat4;
    projectionMatrixInverse: mat4;
}
export { Camera };
