export const hexToRgb = (hex: string) => {
  let alpha = false;
  let h = hex.slice(hex.startsWith('#') ? 1 : 0);

  if (h.length === 3) {
    h = [...h].map(x => x + x).join('');
  }
  else if (h.length === 8) {
    alpha = true;
  }

  let hx = parseInt(h, 16);
  return {
    r: hx >>> (alpha ? 24 : 16),
    g: (hx & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8),
    b: (hx & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0),
    a: alpha ? `, ${hx & 0x000000ff}` : null
  };
};
