import {Scene} from '../primitives/Scene.js';
import {PerspectiveCamera} from '../cameras/PerspectiveCamera.js';

interface Renderer {
  render(scene: Scene, camera: PerspectiveCamera): void;
}

export {Renderer};
