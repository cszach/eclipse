struct VertexInput {
  @location(1) position: vec3f,
  @location(2) normal: vec3f,
  @location(3) uv: vec2f,
  @location(4) materialIndex: f32,
}

@group(0) @binding(0) var<uniform> modelViewProjectionMatrix: mat4x4f;

struct VertexOutput {
  @builtin(position) position: vec4f,
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = modelViewProjectionMatrix * vec4f(input.position, 1);

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return vec4f(1, 0, 0, 1);
}
