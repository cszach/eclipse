import { Light } from './Light.js';
import { POINT_LIGHT } from './constants.js';
import { vec3 } from 'wgpu-matrix';
class PointLight extends Light {
    constructor(color = vec3.create(1, 1, 1), intensity = 1) {
        super(color, intensity);
        this.type = POINT_LIGHT;
    }
}
export { PointLight };
//# sourceMappingURL=PointLight.js.map