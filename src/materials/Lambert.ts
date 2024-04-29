import {LAMBERT} from './constants.js';
import {Material} from './Material.js';
import {Vec3} from 'wgpu-matrix';

class Lambert extends Material {
  override readonly type = LAMBERT;
  color: Vec3;

  constructor(color: Vec3) {
    super();

    this.color = color;
  }
}

export {Lambert};
