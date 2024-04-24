import {Light} from './Light.js';
import {vec3, Vec3} from 'wgpu-matrix';
import {AMBIENT_LIGHT} from './constants.js';

class AmbientLight extends Light {
  override readonly type: number = AMBIENT_LIGHT;

  constructor(color: Vec3 = vec3.create(1, 1, 1), intensity = 1) {
    super(color, intensity);
  }
}

export {AmbientLight};
