import {MaxRectsPacker, Rectangle} from 'maxrects-packer';
import {Texture, TextureOptions} from './exports.js';

class TextureAtlas extends Texture {
  private packer: MaxRectsPacker;

  constructor(
    size: number,
    textures: Iterable<Texture>,
    options: TextureOptions
  ) {
    super(
      {width: size, height: size},
      'clamp-to-edge',
      'clamp-to-edge',
      'linear',
      'linear',
      options
    );

    this.packer = new MaxRectsPacker(size, size, 0);

    // @ts-ignore
    this.packer.addArray(Array.from(textures));
    // FIXME: addArray might not add data
  }

  override build(device: GPUDevice) {
    if (this.gpuObject) this.gpuObject.destroy();

    this.gpuObject = device.createTexture({
      size: [this.width, this.height],
      format: this.options.format,
      usage: this.options.usage,
    });
  }

  insert(texture: Texture) {
    // @ts-ignore
    this.packer.add({
      width: texture.width,
      height: texture.height,
      image: texture.image,
    });
  }

  remove() {
    throw new Error('This method has not been implemented yet');
  }

  repack(quick = true) {
    this.packer.repack(quick);
  }

  reset() {
    if (this.packer.bins[0]) this.packer.bins[0].rects.length = 0;
  }

  rectangles(): Rectangle[] {
    return this.packer.bins[0].rects;
  }
}

export {TextureAtlas};
