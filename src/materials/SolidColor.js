import { SOLID_COLOR } from './constants.js';
import { Material } from './Material.js';
import { vec3 } from 'wgpu-matrix';
class SolidColor extends Material {
    constructor(color = vec3.create(1, 1, 1)) {
        super();
        this.type = SOLID_COLOR;
        this.color = color;
    }
}
export { SolidColor };
//# sourceMappingURL=SolidColor.js.map