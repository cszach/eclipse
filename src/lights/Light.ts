import {Vec3} from 'wgpu-matrix';

interface Light {
  type: number;
  color: Vec3;
  intensity: number;
}

export {Light};
