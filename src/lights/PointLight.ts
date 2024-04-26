import {Light} from './Light.js';
import {POINT_LIGHT} from './constants.js';
import {vec3} from 'wgpu-matrix';

class PointLight extends Light {
  override readonly type = POINT_LIGHT;

  constructor(color = vec3.create(1, 1, 1), intensity = 1) {
    super(color, intensity);
  }
}

export {PointLight};
