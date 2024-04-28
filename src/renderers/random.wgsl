const PI = 3.141592653589793;

fn randomInt(state: ptr<function, u32>) {
    let oldState = *state + 747796405u + 2891336453u;
    let word = ((oldState >> ((oldState >> 28u) + 4u)) ^ oldState) * 277803737u;
    *state = (word >> 22u) ^ word;
}

fn random_float(state: ptr<function, u32>) -> f32 {
    randomInt(state);
    return f32(*state) / f32(0xffffffffu);
}

fn random_in_range(min: f32, max: f32, state: ptr<function, u32>) -> f32 {
    return min + random_float(state) * (max - min);
}

fn random_in_unit_sphere(state: ptr<function, u32>) -> vec3f {
    let radius = pow(random_float(state), 0.33333f);
    let theta = PI * random_float(state);
    let phi = 2f * PI * random_float(state);

    return vec3f(
        radius * sin(theta) * cos(phi),
        radius * sin(theta) * sin(phi),
        radius * cos(theta),
    );
}

fn random_in_hemisphere(normal: vec3f, state: ptr<function, u32>) -> vec3f {
    var v = random_in_unit_sphere(state);

    if dot(v, normal) < 0 {
        v = -v;
    }

    return v;
}

fn random_in_pixel(state: ptr<function, u32>) -> vec3f {
    let x = -0.5 + random_float(state);
    let y = -0.5 + random_float(state);

    return x * viewport.du + y * viewport.dv;
}

fn init_rng(pixel: vec2<u32>, resolution: vec2<u32>, frame: u32) -> u32 {
    let seed = dot(pixel, vec2<u32>(1u, resolution.x)) ^ jenkins_hash(frame);
    return jenkins_hash(seed);
}

fn jenkins_hash(input: u32) -> u32 {
    var x = input;
    x += x << 10u;
    x ^= x >> 6u;
    x += x << 3u;
    x ^= x >> 11u;
    x += x << 15u;
    return x;
}
