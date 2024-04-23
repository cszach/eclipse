import {vec3, quat, Vec3, mat4} from 'wgpu-matrix';
import {UP} from '../constants.js';

class Group {
  children: Group[];
  localPosition: vec3;
  localQuaternion: quat;
  localScale: vec3;

  static readonly DEFAULT_UP: vec3 = vec3.create(0, 1, 0);

  constructor() {
    this.children = [];
    this.localPosition = vec3.create();
    this.localQuaternion = quat.identity();
    this.localScale = vec3.create(1, 1, 1);
  }

  add(...children: Group[]) {
    this.children.push(...children);
  }

  traverse(
    callback: (
      group: Group,
      relativePosition: vec3,
      relativeRotation: quat,
      relativeScale: vec3,
      localPosition: vec3,
      localRotation: quat,
      localScale: vec3
    ) => void,
    offsetPosition: vec3 = vec3.create(),
    offsetRotation: quat = quat.identity(),
    offsetScale: vec3 = vec3.create(1, 1, 1)
  ): void {
    callback(
      this,
      vec3.add(this.localPosition, offsetPosition),
      quat.multiply(this.localQuaternion, offsetRotation),
      vec3.multiply(this.localScale, offsetScale),
      this.localPosition,
      this.localQuaternion,
      this.localScale
    );

    this.children.forEach(child => {
      child.traverse(
        callback.bind(child),
        vec3.add(this.localPosition, offsetPosition),
        quat.multiply(this.localQuaternion, offsetRotation),
        vec3.multiply(this.localScale, offsetScale)
      );
    });
  }
}

export {Group, Group as Object3D};
