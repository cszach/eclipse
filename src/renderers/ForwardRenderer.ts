class ForwardRenderer {
  readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement = document.createElement('canvas')) {
    this.canvas = canvas;
  }
}
