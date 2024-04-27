fn randomInt(state: ptr<function, u32>) {
    let oldState = *state + 747796405u + 2891336453u;
    let word = ((oldState >> ((oldState >> 28u) + 4u)) ^ oldState) * 277803737u;
    *state = (word >> 22u) ^ word;
}

fn randomFloat(state: ptr<function, u32>) -> f32 {
    randomInt(state);
    return f32(*state) / f32(0xffffffffu);
}

fn randomInRange(min: f32, max: f32, state: ptr<function, u32>) -> f32 {
    return min + randomFloat(state) * (max - min);
}

fn initRng(pixel: vec2<u32>, resolution: vec2<u32>, frame: u32) -> u32 {
    let seed = dot(pixel, vec2<u32>(1u, resolution.x)) ^ jenkinsHash(frame);
    return jenkinsHash(seed);
}

fn jenkinsHash(input: u32) -> u32 {
    var x = input;
    x += x << 10u;
    x ^= x >> 6u;
    x += x << 3u;
    x ^= x >> 11u;
    x += x << 15u;
    return x;
}
