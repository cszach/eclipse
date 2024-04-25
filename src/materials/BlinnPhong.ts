import {Material} from './Material.js';
import {vec3, Vec3} from 'wgpu-matrix';

class BlinnPhong extends Material {
  color: Vec3;
  specular: Vec3;
  shininess: number;

  constructor(
    color: Vec3 = vec3.create(1, 1, 1),
    specular: Vec3 = vec3.create(0x11 / 0xff, 0x11 / 0xff, 0x11 / 0xff),
    shininess = 30
  ) {
    super();

    this.color = color;
    this.specular = specular;
    this.shininess = shininess;
  }
}

export {BlinnPhong};
