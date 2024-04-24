import {Object3D} from '../primitives/Group.js';
import {Light} from './Light.js';
import {vec3, Vec3} from 'wgpu-matrix';

class AmbientLight extends Object3D implements Light {
  color: Vec3;
  intensity: number;

  constructor(color: Vec3 = vec3.create(1, 1, 1), intensity = 1) {
    super();

    this.color = color;
    this.intensity = intensity;
  }
}

export {AmbientLight};
