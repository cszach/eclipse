class PerspectiveCamera {
  verticalFovRadians: number;
  aspectRatio: number;
  near: number;
  far: number;

  constructor(
    verticalFovRadians?: number,
    aspectRatio?: number,
    near?: number,
    far?: number
  ) {
    this.verticalFovRadians = verticalFovRadians ?? Math.PI / 4;
    this.aspectRatio = aspectRatio ?? 1;
    this.near = near ?? 0.1;
    this.far = far ?? 1000;
  }
}

export {PerspectiveCamera};
