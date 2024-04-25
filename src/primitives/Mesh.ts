import {Geometry} from '../geometries/Geometry.js';
import {Material} from '../materials/Material.js';
import {Group} from './Group.js';

class Mesh extends Group {
  geometry: Geometry;
  material: Material;

  constructor(geometry: Geometry, material: Material) {
    super();

    this.geometry = geometry;
    this.material = material;
  }
}

export {Mesh};
