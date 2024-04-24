import {Geometry} from '../geometries/Geometry.js';
import {SolidColor} from '../materials/SolidColor.js';
import {Group} from './Group.js';

class Mesh extends Group {
  geometry: Geometry;
  material: SolidColor;

  constructor(geometry: Geometry, material: SolidColor) {
    super();

    this.geometry = geometry;
    this.material = material;
  }
}

export {Mesh};
