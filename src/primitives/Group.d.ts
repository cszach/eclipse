import { vec3, quat } from 'wgpu-matrix';
declare class Group {
    children: Group[];
    localPosition: vec3;
    localQuaternion: quat;
    localScale: vec3;
    static readonly DEFAULT_UP: vec3;
    constructor();
    add(...children: Group[]): void;
    traverse(callback: (group: Group, relativePosition: vec3, relativeRotation: quat, relativeScale: vec3, localPosition: vec3, localRotation: quat, localScale: vec3) => void, offsetPosition?: vec3, offsetRotation?: quat, offsetScale?: vec3): void;
}
export { Group, Group as Object3D };
