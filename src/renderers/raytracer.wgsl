const EPSILON = 0.001;

struct Viewport {
  // Viewport:
  //       du
  // (0, 0)------->U
  //    dv|       |
  //      |       |
  //      v-------x
  //      V
  origin: vec3<f32>, // The location of pixel (0, 0) in 3D space
  du: vec3<f32>,     // The distance between 2 neighbor pixels on the U axis
  dv: vec3<f32>,     // The distance between 2 neighbor pixels on the V axis
}

struct Vertex {
  position: vec3f,
  normal: vec3f,
  uv: vec2f,
  materialIndex: f32,
}

alias IndexedFace = vec3u;

struct Ray {
  origin: vec3f,
  direction: vec3f,
}


@group(0) @binding(0) var<uniform> frame_dimensions: vec2u;
@group(0) @binding(1) var<storage, read_write> frame_buffer: array<vec3f>;
@group(0) @binding(2) var<uniform> frame: u32;
@group(0) @binding(3) var<uniform> camera_position: vec3f;
@group(0) @binding(4) var<uniform> viewport: Viewport;
@group(0) @binding(5) var<storage> vertices: array<Vertex>;
@group(0) @binding(6) var<storage> faces: array<IndexedFace>;

const WORKGROUP_SIZE = 8;

@compute @workgroup_size(WORKGROUP_SIZE, WORKGROUP_SIZE)
fn computeMain(@builtin(global_invocation_id) pixel: vec3u) {
    // The frame (canvas) dimensions may not be divisble by workgroup size, and
    // thus the workgroup count is rounded up. This may result in extra pixels,
    // so return if a pixel is outside of the frame.
    if pixel.x >= frame_dimensions.x || pixel.y >= frame_dimensions.y {
        return;
    }

    let ray = ray(pixel.xy);

    let frame_buffer_index = pixel.x + pixel.y * frame_dimensions.x;

    frame_buffer[frame_buffer_index] = vec3f(
        f32(pixel.x) / f32(frame_dimensions.x),
        f32(pixel.y) / f32(frame_dimensions.y),
        1
    );
}

fn ray(pixel: vec2u) -> Ray {
    let pixel_center = viewport.origin + f32(pixel.x) * viewport.du + f32(pixel.y) * viewport.dv;

    return Ray(camera_position, pixel_center - camera_position);
}
