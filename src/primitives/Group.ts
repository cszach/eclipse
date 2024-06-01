import {vec3, quat, Quat, Vec3} from 'wgpu-matrix';

class Group {
  children: Group[];
  localPosition: Vec3;
  localQuaternion: Quat;
  localScale: Vec3;

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
