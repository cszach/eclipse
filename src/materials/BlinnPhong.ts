import {Texture} from '../textures/Texture.js';
import {Material} from './Material.js';
import {BLINN_PHONG} from './constants.js';
import {vec3, Vec3} from 'wgpu-matrix';

class BlinnPhong extends Material {
  override readonly type = BLINN_PHONG;
  color: Vec3;
  colorMap?: Texture;
  specular: Vec3;
  shininess: number;

  constructor(
    color: Vec3 = vec3.create(1, 1, 1),
    specular: Vec3 = vec3.create(0x11 / 0xff, 0x11 / 0xff, 0x11 / 0xff),
    shininess = 30,
    colorMap?: Texture
  ) {
    super();

    this.color = color;
    this.colorMap = colorMap;
    this.specular = specular;
    this.shininess = shininess;
  }
}

export {BlinnPhong};
