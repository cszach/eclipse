import {Material} from './Material.js';
import {MIRROR} from './constants.js';
import {Vec3} from 'wgpu-matrix';

class Mirror extends Material {
  override readonly type = MIRROR;
  color: Vec3;

  constructor(color: Vec3) {
    super();

    this.color = color;
  }
}

export {Mirror};
