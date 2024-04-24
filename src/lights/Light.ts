import {Vec3} from 'wgpu-matrix';
import {Object3D} from '../primitives/Group.js';

abstract class Light extends Object3D {
  readonly type: number = 0;
  color: Vec3;
  intensity: number;

  constructor(color: Vec3, intensity: number) {
    super();

    this.color = color;
    this.intensity = intensity;
  }
}

export {Light};
