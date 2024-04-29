import { Material } from './Material.js';
import { BLINN_PHONG } from './constants.js';
import { vec3 } from 'wgpu-matrix';
class BlinnPhong extends Material {
    constructor(color = vec3.create(1, 1, 1), specular = vec3.create(0x11 / 0xff, 0x11 / 0xff, 0x11 / 0xff), shininess = 30) {
        super();
        this.type = BLINN_PHONG;
        this.color = color;
        this.specular = specular;
        this.shininess = shininess;
    }
}
export { BlinnPhong };
//# sourceMappingURL=BlinnPhong.js.map