import {vec3} from 'wgpu-matrix';

class Group {
  children: Group[];
  localPosition: vec3;
  up: vec3;

  static readonly DEFAULT_UP: vec3 = vec3.create(0, 1, 0);

  constructor() {
    this.children = [];
    this.localPosition = vec3.create(0, 0, 0);
    this.up = vec3.clone(Group.DEFAULT_UP);
  }

  add(...children: Group[]) {
    this.children.push(...children);
  }

  traverse(
    callback: (group: Group, relativePosition: vec3) => void,
    offsetPosition: vec3 = vec3.create(0, 0, 0)
  ): void {
    callback(this, vec3.add(this.localPosition, offsetPosition));

    this.children.forEach(child => {
      child.traverse(
        callback.bind(child),
        vec3.add(this.localPosition, offsetPosition)
      );
    });
  }
}

export {Group, Group as Object3D};
