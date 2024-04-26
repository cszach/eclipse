// @group(0) @binding(0) var<uniform> imageDimensions: vec2u;
// @group(0) @binding(1) var<storage, read_write> frameBuffer: array<vec3f>;

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
    return vec4f(input.uv.x, input.uv.y, 1, 1);
}
