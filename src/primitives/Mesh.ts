import {Geometry} from '../geometries/Geometry.js';
import {Group} from './Group.js';

class Mesh extends Group {
  geometry: Geometry;

  constructor(geometry: Geometry) {
    super();

    this.geometry = geometry;
  }
}

export {Mesh};
