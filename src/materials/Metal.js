import { Material } from './Material.js';
import { METAL } from './constants.js';
class Metal extends Material {
    constructor(color, fuzziness) {
        super();
        this.type = METAL;
        this.color = color;
        this.fuzziness = fuzziness;
    }
}
export { Metal };
//# sourceMappingURL=Metal.js.map