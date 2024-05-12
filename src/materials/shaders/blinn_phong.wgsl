fn ambient(lightColor: vec3f, lightIntensity: f32, baseColor: vec3f) -> vec3f {
  return baseColor * lightColor * lightIntensity;
}

fn point_light(
  light: Light,
  material: Material,
  normal: vec3f,
  fragWorldPosition: vec3f,
  cameraPosition: vec3f
) -> vec3f {
  let lightDirection = normalize(fragWorldPosition - light.position);
  let viewDirection = normalize(fragWorldPosition - cameraPosition);
  let halfwayVector = normalize(-lightDirection - viewDirection);
  let reflectDirection = reflect(lightDirection, normal);

  let diffuse = max(dot(normalize(normal), -lightDirection), 0);
  let diffuseColor = light.color * diffuse;

  let specular = pow(max(dot(normal, halfwayVector), 0.0), material.shininess);
  let specularColor = material.specular * specular;

  return (diffuseColor + specularColor) * light.intensity * material.color;
}

fn blinn_phong(
  material: Material,
  frag: VertexOutput,
  lights: ptr<storage, array<Light>>,
  cameraPosition: vec3f
) -> vec4f {
  var color = vec3f();

  for (var i = 0u; i < arrayLength(lights); i++) {
    let light = lights[i];

    switch u32(light.typeId) {
      case 1: {
        color += ambient(light.color, light.intensity, material.color);
      }
      case 2: {
        color += point_light(
          light,
          material,
          frag.normal,
          frag.worldPosition,
          cameraPosition
        );
      }
      default: {
        // Do nothing
      }
    }
  }

  return vec4f(color, 1);
}
