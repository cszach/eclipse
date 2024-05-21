import {mat4} from 'wgpu-matrix';
import {Group} from '../primitives/exports.js';

interface Camera extends Group {
  projectionMatrix: mat4;
  projectionMatrixInverse: mat4;
}

export {Camera};
