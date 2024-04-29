import { Light } from './Light.js';
import { vec3 } from 'wgpu-matrix';
import { AMBIENT_LIGHT } from './constants.js';
class AmbientLight extends Light {
    constructor(color = vec3.create(1, 1, 1), intensity = 1) {
        super(color, intensity);
        this.type = AMBIENT_LIGHT;
    }
}
export { AmbientLight };
//# sourceMappingURL=AmbientLight.js.map