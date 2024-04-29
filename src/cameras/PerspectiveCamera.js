import { Group } from '../primitives/Group.js';
import { mat4 } from 'wgpu-matrix';
class PerspectiveCamera extends Group {
    constructor(verticalFovRadians, aspectRatio, near, far) {
        super();
        this._verticalFovRadians = verticalFovRadians !== null && verticalFovRadians !== void 0 ? verticalFovRadians : Math.PI / 4;
        this._aspectRatio = aspectRatio !== null && aspectRatio !== void 0 ? aspectRatio : 1;
        this._near = near !== null && near !== void 0 ? near : 0.1;
        this._far = far !== null && far !== void 0 ? far : 1000;
        this.updateProjectMatrix();
    }
    get verticalFovRadians() {
        return this._verticalFovRadians;
    }
    set verticalFovRadians(newVerticalFovRadians) {
        this._verticalFovRadians = newVerticalFovRadians;
        this.updateProjectMatrix();
    }
    get aspectRatio() {
        return this._aspectRatio;
    }
    set aspectRatio(newAspectRatio) {
        this._aspectRatio = newAspectRatio;
        this.updateProjectMatrix();
    }
    get near() {
        return this._near;
    }
    set near(newNear) {
        this._near = newNear;
        this.updateProjectMatrix();
    }
    get far() {
        return this._far;
    }
    set far(newFar) {
        this._far = newFar;
        this.updateProjectMatrix();
    }
    updateProjectMatrix() {
        this.projectionMatrix = mat4.perspective(this._verticalFovRadians, this._aspectRatio, this._near, this._far);
        this.projectionMatrixInverse = mat4.invert(this.projectionMatrix);
    }
}
export { PerspectiveCamera };
//# sourceMappingURL=PerspectiveCamera.js.map