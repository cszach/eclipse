import {Group} from '../primitives/Group.js';
import {vec3} from 'wgpu-matrix';

class PerspectiveCamera extends Group {
  verticalFovRadians: number;
  aspectRatio: number;
  near: number;
  far: number;
  static readonly UP: vec3 = vec3.create(0, 0, 0);

  constructor(
    verticalFovRadians?: number,
    aspectRatio?: number,
    near?: number,
    far?: number
  ) {
    super();

    this.verticalFovRadians = verticalFovRadians ?? Math.PI / 4;
    this.aspectRatio = aspectRatio ?? 1;
    this.near = near ?? 0.1;
    this.far = far ?? 1000;
  }
}

export {PerspectiveCamera};
