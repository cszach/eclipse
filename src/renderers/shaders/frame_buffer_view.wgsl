@group(0) @binding(0) var<uniform> resolution: vec2u;
@group(0) @binding(1) var<storage, read_write> frame_buffer: array<vec3f>;
@group(0) @binding(2) var<uniform> frame_count: u32;

struct VertexInput {
  @location(1) position: vec2f,
  @location(2) uv: vec2f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(1) uv: vec2f,
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(input.position, 0.0, 1.0);
    output.uv = input.uv;

    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let pixel_x = u32(input.uv.x * f32(resolution.x));
    let pixel_y = u32(input.uv.y * f32(resolution.y));

    let frame_buffer_index = pixel_x + pixel_y * resolution.x;

    return vec4f(
        frame_buffer[frame_buffer_index].x,
        frame_buffer[frame_buffer_index].y,
        frame_buffer[frame_buffer_index].z,
        1
    ) / f32(frame_count + 1);
}
