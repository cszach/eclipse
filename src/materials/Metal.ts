import {Material} from './Material.js';
import {METAL} from './constants.js';
import {Vec3} from 'wgpu-matrix';

class Metal extends Material {
  override readonly type = METAL;
  color: Vec3;
  fuzziness: number;

  constructor(color: Vec3, fuzziness: number) {
    super();

    this.color = color;
    this.fuzziness = fuzziness;
  }
}

export {Metal};
