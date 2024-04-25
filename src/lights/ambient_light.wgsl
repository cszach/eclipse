fn ambient(baseColor: vec3f, lightColor: vec3f, lightIntensity: f32) -> vec3f {
  return baseColor * lightColor * lightIntensity;
}
