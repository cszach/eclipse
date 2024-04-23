import {Group} from '../primitives/Group.js';
import {Camera} from './Camera.js';
import {vec3, mat4} from 'wgpu-matrix';

class PerspectiveCamera extends Group implements Camera {
  projectionMatrix: mat4;
  projectionMatrixInverse: mat4;

  private _verticalFovRadians: number;
  private _aspectRatio: number;
  private _near: number;
  private _far: number;

  constructor(
    verticalFovRadians?: number,
    aspectRatio?: number,
    near?: number,
    far?: number
  ) {
    super();

    this._verticalFovRadians = verticalFovRadians ?? Math.PI / 4;
    this._aspectRatio = aspectRatio ?? 1;
    this._near = near ?? 0.1;
    this._far = far ?? 1000;

    this.updateProjectMatrix();
  }

  get verticalFovRadians() {
    return this._verticalFovRadians;
  }

  set verticalFovRadians(newVerticalFovRadians: number) {
    this._verticalFovRadians = newVerticalFovRadians;
    this.updateProjectMatrix();
  }

  get aspectRatio() {
    return this._aspectRatio;
  }

  set aspectRatio(newAspectRatio: number) {
    this._aspectRatio = newAspectRatio;
    this.updateProjectMatrix();
  }

  get near() {
    return this._near;
  }

  set near(newNear: number) {
    this._near = newNear;
    this.updateProjectMatrix();
  }

  get far() {
    return this._far;
  }

  set far(newFar: number) {
    this._far = newFar;
    this.updateProjectMatrix();
  }

  private updateProjectMatrix() {
    this.projectionMatrix = mat4.perspective(
      this._verticalFovRadians,
      this._aspectRatio,
      this._near,
      this._far
    );

    this.projectionMatrixInverse = mat4.invert(this.projectionMatrix);
  }
}

export {PerspectiveCamera};
