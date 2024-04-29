import { vec3, quat } from 'wgpu-matrix';
class Group {
    constructor() {
        this.children = [];
        this.localPosition = vec3.create();
        this.localQuaternion = quat.identity();
        this.localScale = vec3.create(1, 1, 1);
    }
    add(...children) {
        this.children.push(...children);
    }
    traverse(callback, offsetPosition = vec3.create(), offsetRotation = quat.identity(), offsetScale = vec3.create(1, 1, 1)) {
        callback(this, vec3.add(this.localPosition, offsetPosition), quat.multiply(this.localQuaternion, offsetRotation), vec3.multiply(this.localScale, offsetScale), this.localPosition, this.localQuaternion, this.localScale);
        this.children.forEach(child => {
            child.traverse(callback.bind(child), vec3.add(this.localPosition, offsetPosition), quat.multiply(this.localQuaternion, offsetRotation), vec3.multiply(this.localScale, offsetScale));
        });
    }
}
Group.DEFAULT_UP = vec3.create(0, 1, 0);
export { Group, Group as Object3D };
//# sourceMappingURL=Group.js.map