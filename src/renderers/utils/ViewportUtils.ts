import {Vec3, vec3} from 'wgpu-matrix';
import {PerspectiveCamera} from '../../cameras/PerspectiveCamera.js';
import {UP} from '../../constants.js';

type ViewportData = {
  origin: Vec3;
  du: Vec3;
  dv: Vec3;
};

class ViewportUtils {
  static getData(
    camera: PerspectiveCamera,
    canvas: HTMLCanvasElement
  ): ViewportData {
    const lookAt = [0, 0, 0]; // TODO: do not hard-code lookAt
    const focalLength = vec3.length(
      vec3.subtract(camera.localPosition, lookAt)
    );
    const h = Math.tan(camera.vfovRadians / 2);
    const viewportHeight = 2 * h * focalLength;
    const viewportWidth = viewportHeight * camera.aspectRatio;

    // Opposite of camera direction
    const w = vec3.normalize(vec3.subtract(camera.localPosition, lookAt));
    const normalizedU = vec3.normalize(vec3.cross(UP, w)); // Local right
    const normalizedV = vec3.cross(w, normalizedU); // Local up

    const u = vec3.mulScalar(normalizedU, viewportWidth);
    const v = vec3.mulScalar(vec3.negate(normalizedV), viewportHeight);

    const du = vec3.divScalar(u, canvas.width);
    const dv = vec3.divScalar(v, canvas.height);

    const halfU = vec3.divScalar(u, 2);
    const halfV = vec3.divScalar(v, 2);

    // viewportUpperLeft = cameraPos - (w * focalLength) - U / 2 - V / 2
    const viewportUpperLeft = vec3.sub(
      vec3.sub(
        vec3.sub(camera.localPosition, vec3.mulScalar(w, focalLength)),
        halfU
      ),
      halfV
    );

    const pixelDuv = vec3.add(du, dv);
    const halfPixelDuv = vec3.mulScalar(pixelDuv, 0.5);
    const origin = vec3.add(viewportUpperLeft, halfPixelDuv);

    return {origin, du, dv};
  }
}

export {ViewportUtils, ViewportData};
