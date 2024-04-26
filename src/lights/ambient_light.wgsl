fn ambient(light: Light, baseColor: vec3f) -> vec3f {
  return baseColor * light.color * light.intensity;
}
