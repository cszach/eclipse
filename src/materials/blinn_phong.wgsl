fn blinn_phong(material: Material, frag: VertexOutput, lights: ptr<storage, array<Light>>, cameraPosition: vec3f) -> vec4f {
  var color = vec3f();

  for (var i = 0u; i < arrayLength(lights); i++) {
    let light = lights[i];

    switch u32(light.typeId) {
      case 1: {
        color += ambient(light, material.color);
      }
      case 2: {
        color += pointLight(light, material, frag.normal, frag.worldPosition, cameraPosition);
      }
      default: {
        // Do nothing
      }
    }
  }

  return vec4f(color, 1);
}
