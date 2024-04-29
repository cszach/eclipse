import { LAMBERT } from './constants.js';
import { Material } from './Material.js';
class Lambert extends Material {
    constructor(color) {
        super();
        this.type = LAMBERT;
        this.color = color;
    }
}
export { Lambert };
//# sourceMappingURL=Lambert.js.map