import {METAL} from './constants.js';
import {Material} from './Material.js';
import {Texture} from '../textures/Texture.js';
import {Vec3} from 'wgpu-matrix';
import {hexToRgb} from './utils.js';

class Metal extends Material {
  override readonly type = METAL;
  color: Vec3;
  fuzziness: number;
  colorMap?: Texture;

  constructor(color: string | Vec3, fuzziness: number, colorMap?: Texture) {
    super();

    if (typeof color === 'string') {
      const {r, g, b} = hexToRgb(color);

      this.color = [r / 255, g / 255, b / 255];
    } else {
      this.color = color;
    }
    this.fuzziness = fuzziness;
    this.colorMap = colorMap;
  }
}

export {Metal};
