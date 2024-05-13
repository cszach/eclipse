struct Vertex {
  position: vec3f,
  normal: vec3f,
  uv: vec2f,
  materialIndex: f32,
}

alias IndexedTriangle = vec3u;

struct Material {
  color: vec3f,
  shininess: f32,
  specular: vec3f,
  typeId: f32,
}

struct Ray {
  origin: vec3f,
  direction: vec3f,
}

struct AABB {
    min: vec3f,
    max: vec3f,
    left_child_index: u32,
    right_child_index: u32,
    object_index: u32,
}
