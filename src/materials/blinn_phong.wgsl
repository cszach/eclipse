fn blinn_phong(baseColor: vec3f, lights: ptr<storage, array<Light>>) -> vec4f {
  var color = vec3f();

  for (var i = 0u; i < arrayLength(lights); i++) {
    let light = lights[i];

    switch u32(light.typeId) {
      case 1: {
        color += ambient(baseColor, light.color, light.intensity);
      }
      default: {
        // Do nothing
      }
    }
  }

  return vec4f(color, 1);
}
