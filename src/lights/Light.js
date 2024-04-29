import { Object3D } from '../primitives/Group.js';
class Light extends Object3D {
    constructor(color, intensity) {
        super();
        this.type = 0;
        this.color = color;
        this.intensity = intensity;
    }
}
export { Light };
//# sourceMappingURL=Light.js.map