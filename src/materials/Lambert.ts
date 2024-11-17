import {Texture} from '../textures/exports.js';
import {LAMBERT} from './constants.js';
import {Material} from './Material.js';
import {Vec3} from 'wgpu-matrix';
import {hexToRgb} from './utils.js';

class Lambert extends Material {
  override readonly type = LAMBERT;
  color: Vec3;
  colorMap?: Texture;

  constructor(color: string | Vec3, colorMap?: Texture) {
    super();

    if (typeof color === 'string') {
      const {r, g, b} = hexToRgb(color);

      this.color = [r / 255, g / 255, b / 255];
    } else {
      this.color = color;
    }
    this.colorMap = colorMap;
  }
}

export {Lambert};
