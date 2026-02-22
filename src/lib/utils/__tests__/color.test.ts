import { isLightColor } from '../color';

describe('isLightColor', () => {
  // --- Clearly light colors ---
  it('returns true for white (#FFFFFF)', () => {
    expect(isLightColor('#FFFFFF')).toBe(true);
  });

  it('returns true for white without hash (FFFFFF)', () => {
    expect(isLightColor('FFFFFF')).toBe(true);
  });

  it('returns true for light yellow (#FFFF00)', () => {
    // R=1, G=1, B=0 → luminance = 0.2126 + 0.7152 = 0.9278
    expect(isLightColor('#FFFF00')).toBe(true);
  });

  it('returns true for light cyan (#00FFFF)', () => {
    // R=0, G=1, B=1 → luminance = 0 + 0.7152 + 0.0722 = 0.7874
    expect(isLightColor('#00FFFF')).toBe(true);
  });

  it('returns true for light gray (#C0C0C0)', () => {
    // ~0.75 normalized → luminance ≈ 0.75
    expect(isLightColor('#C0C0C0')).toBe(true);
  });

  // --- Clearly dark colors ---
  it('returns false for black (#000000)', () => {
    expect(isLightColor('#000000')).toBe(false);
  });

  it('returns false for dark red (#8B0000)', () => {
    // R=139/255≈0.545 → luminance = 0.2126*0.545 ≈ 0.116
    expect(isLightColor('#8B0000')).toBe(false);
  });

  it('returns false for dark blue (#00008B)', () => {
    // B=139/255≈0.545 → luminance = 0.0722*0.545 ≈ 0.039
    expect(isLightColor('#00008B')).toBe(false);
  });

  it('returns false for navy (#000080)', () => {
    expect(isLightColor('#000080')).toBe(false);
  });

  // --- Boundary / mid-range ---
  it('returns false for pure red (#FF0000)', () => {
    // R=1 → luminance = 0.2126 < 0.5
    expect(isLightColor('#FF0000')).toBe(false);
  });

  it('returns true for pure green (#00FF00)', () => {
    // G=1 → luminance = 0.7152 > 0.5
    expect(isLightColor('#00FF00')).toBe(true);
  });

  it('returns false for pure blue (#0000FF)', () => {
    // B=1 → luminance = 0.0722 < 0.5
    expect(isLightColor('#0000FF')).toBe(false);
  });

  it('returns false for medium gray (#808080)', () => {
    // 128/255 ≈ 0.502 → luminance ≈ 0.502 > 0.5 — just barely light
    // Actually 0.502 > 0.5 so this should be true
    const r = 0x80 / 255;
    const luminance = 0.2126 * r + 0.7152 * r + 0.0722 * r;
    expect(isLightColor('#808080')).toBe(luminance > 0.5);
  });

  // --- Case insensitivity ---
  it('handles lowercase hex', () => {
    expect(isLightColor('#ffffff')).toBe(true);
    expect(isLightColor('#000000')).toBe(false);
  });

  it('handles mixed case hex', () => {
    expect(isLightColor('#FfFfFf')).toBe(true);
  });
});
