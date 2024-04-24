import {Vec3} from 'wgpu-matrix';

interface Light {
  color: Vec3;
  intensity: number;
}

export {Light};
