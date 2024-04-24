import {Object3D} from '../primitives/Group.js';
import {Light} from './Light.js';
import {vec3, Vec3} from 'wgpu-matrix';
import {AMBIENT_LIGHT} from '../constants.js';

class AmbientLight extends Object3D implements Light {
  type: number;
  color: Vec3;
  intensity: number;

  constructor(color: Vec3 = vec3.create(1, 1, 1), intensity = 1) {
    super();

    this.type = AMBIENT_LIGHT;
    this.color = color;
    this.intensity = intensity;
  }
}

export {AmbientLight};
