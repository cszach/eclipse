import {RenderData} from '../renderers/RenderData.js';

type TextureOnLoadCallback = (texture: Texture) => void;

type TextureOnBeforeRenderCallback = (
  renderData: RenderData,
  texture: Texture
) => void;

type TextureOptions = {
  label?: string;
  wgslIdentifier: string;
  wgslType: string;
  usage: number;
  format: GPUTextureFormat;
  onBeforeRender?: TextureOnBeforeRenderCallback;
};

class Texture {
  image: GPUImageCopyExternalImageSource | {width: number; height: number};
  width: number;
  height: number;
  wrapU: GPUAddressMode;
  wrapV: GPUAddressMode;
  minFilter: GPUFilterMode;
  magFilter: GPUFilterMode;
  gpuObject?: GPUTexture;
  options: TextureOptions;
  onBeforeRender?: TextureOnBeforeRenderCallback;

  xOnAtlas = 0;
  yOnAtlas = 0;
  widthOnAtlas = 0;
  heightOnAtlas = 0;

  constructor(
    image: GPUImageCopyExternalImageSource | {width: number; height: number},
    wrapU: GPUAddressMode,
    wrapV: GPUAddressMode,
    minFilter: GPUFilterMode,
    magFilter: GPUFilterMode,
    options: TextureOptions
  ) {
    this.image = image;
    this.width = this.isVideoFrame(image) ? image.displayWidth : image.width;
    this.height = this.isVideoFrame(image) ? image.displayHeight : image.height;
    this.wrapU = wrapU;
    this.wrapV = wrapV;
    this.minFilter = minFilter;
    this.magFilter = magFilter;
    this.options = options;
    this.onBeforeRender = options.onBeforeRender;
  }

  build(device: GPUDevice) {
    this.gpuObject = device.createTexture({
      size: [this.width, this.height, 1],
      format: this.options.format,
      usage: this.options.usage,
    });

    device.queue.copyExternalImageToTexture(
      {source: this.image as GPUImageCopyExternalImageSource},
      {texture: this.gpuObject},
      [this.width, this.height]
    );
  }

  static load(
    url: string,
    options: TextureOptions,
    onLoad: TextureOnLoadCallback
  ) {
    fetch(url)
      .then(response => {
        response
          .blob()
          .then(blob => {
            this.resolveBlob(blob, options, onLoad);
          })
          .catch(() => {
            throw new Error('Error reading the request body');
          });
      })
      .catch(() => {
        throw new Error(`Error while fetching ${url}`);
      });
  }

  private isVideoFrame(object: any): object is VideoFrame {
    return (
      object.displayWidth !== undefined && object.displayHeight !== undefined
    );
  }

  private static resolveBlob(
    blob: Blob,
    options: TextureOptions,
    onLoad: TextureOnLoadCallback
  ) {
    createImageBitmap(blob)
      .then(bitmap =>
        onLoad(
          new Texture(
            bitmap,
            'clamp-to-edge',
            'clamp-to-edge',
            'linear',
            'linear',
            options
          )
        )
      )
      .catch(e => {
        console.log(e);
        throw new Error('Error creating bitmap');
      });
  }
}

export {Texture, TextureOptions};
