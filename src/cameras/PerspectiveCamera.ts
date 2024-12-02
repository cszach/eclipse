import {Group} from '../primitives/Group.js';
import {Camera} from './Camera.js';
import {mat4, Mat4} from 'wgpu-matrix';

class PerspectiveCamera extends Group implements Camera {
  projectionMatrix: Mat4;
  projectionMatrixInverse: Mat4;

  vfovRadians: number;
  aspectRatio: number;
  near: number;
  far: number;

  constructor(
    vfovRadians: number = Math.PI / 4,
    aspectRatio: number = 1,
    near: number = 0.1,
    far: number = 1000
  ) {
    super();

    this.vfovRadians = vfovRadians;
    this.aspectRatio = aspectRatio;
    this.near = near;
    this.far = far;

    this.projectionMatrix = mat4.create();
    this.projectionMatrixInverse = mat4.create();
    this.updateProjectMatrix();
  }

  updateProjectMatrix() {
    mat4.perspective(
      this.vfovRadians,
      this.aspectRatio,
      this.near,
      this.far,
      this.projectionMatrix
    );

    mat4.invert(this.projectionMatrix, this.projectionMatrixInverse);
  }
}

export {PerspectiveCamera};
