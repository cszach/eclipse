fn pointLight(
  light: Light,
  material: Material,
  normal: vec3f,
  worldPosition: vec3f,
  cameraPosition: vec3f
) -> vec3f {
  let lightDirection = normalize(worldPosition - light.position);
  let viewDirection = normalize(worldPosition - cameraPosition);
  let halfwayVector = normalize(-lightDirection - viewDirection);
  let reflectDirection = reflect(lightDirection, normal);

  let diffuseStrength = max(dot(normalize(normal), -lightDirection), 0);
  let specular = pow(max(dot(normal, halfwayVector), 0.0), material.shininess);

  let diffuseColor = light.color * diffuseStrength;
  let specularColor = material.specular * specular;

  return (diffuseColor + specularColor) * material.color;
}
