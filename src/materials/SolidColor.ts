import {Material} from './Material.js';
import {vec3, Vec3} from 'wgpu-matrix';

class SolidColor extends Material {
  color: Vec3;

  constructor(color: Vec3 = vec3.create(1, 1, 1)) {
    super();
    this.color = color;
  }
}

export {SolidColor};
