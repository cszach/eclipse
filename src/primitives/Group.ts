import {vec3} from 'wgpu-matrix';

class Group {
  children: Group[];
  localPosition: vec3;

  constructor() {
    this.children = [];
    this.localPosition = vec3.create(0, 0, 0);
  }

  add(...children: Group[]) {
    this.children.push(...children);
  }

  traverse(
    callback: (group: Group, relativePosition: vec3) => void,
    offsetPosition: vec3 = vec3.create(0, 0, 0)
  ): void {
    callback(this, offsetPosition);

    this.children.forEach(child => {
      child.traverse(
        callback.bind(child),
        vec3.add(this.localPosition, offsetPosition)
      );
    });
  }
}

export {Group, Group as Object3D};
