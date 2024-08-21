type TextureOnLoadCallback = (texture: Texture) => void;

class Texture {
  image: GPUImageCopyExternalImageSource;
  wrapU: GPUAddressMode;
  wrapV: GPUAddressMode;
  minFilter: GPUFilterMode;
  maxFilter: GPUFilterMode;

  constructor(
    image: GPUImageCopyExternalImageSource,
    wrapU: GPUAddressMode,
    wrapV: GPUAddressMode,
    minFilter: GPUFilterMode,
    magFilter: GPUFilterMode
  ) {
    this.image = image;
    this.wrapU = wrapU;
    this.wrapV = wrapV;
    this.minFilter = minFilter;
    this.maxFilter = magFilter;
  }

  static load(url: string, onLoad: TextureOnLoadCallback) {
    fetch(url)
      .then(response => {
        response
          .blob()
          .then(blob => this.resolveBlob.bind(null, blob, onLoad))
          .catch(() => {
            throw new Error('Error reading the request body');
          });
      })
      .catch(() => {
        throw new Error(`Error while fetching ${url}`);
      });
  }

  private static resolveBlob(blob: Blob, onLoad: TextureOnLoadCallback) {
    createImageBitmap(blob)
      .then(bitmap =>
        onLoad(
          new Texture(
            bitmap,
            'clamp-to-edge',
            'clamp-to-edge',
            'linear',
            'linear'
          )
        )
      )
      .catch(() => {
        throw new Error('Error creating bitmap');
      });
  }
}

export {Texture};
