// utils.ts

export class Utils {
  static scale(num: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
    return Math.trunc((num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
  }

  // Utility methods
  static getBoolean(value: number | string | boolean): boolean {
    switch (typeof value) {
      case 'number':
        // Any non-zero number is true
        return value !== 0;

      case 'string':
      {
      // Convert string to lowercase for case-insensitive comparison
        const lowercaseValue = value.toLowerCase().trim();
        // Check for truthy string values
        if (['true', 'on', 'yes'].includes(lowercaseValue)) {
          return true;
        }
        // Check for falsy string values
        if (['false', 'off', 'no'].includes(lowercaseValue)) {
          return false;
        }
        // If it's a number string, convert to integer and check if it's non-zero
        const numValue = parseInt(value, 10);
        return !isNaN(numValue) && numValue !== 0;
      }

      case 'boolean':
        // Boolean values are returned as-is
        return value;

      default:
        // For any other type, return false
        return false;
    }
  }

  static RGBtoHSV(r, g, b, w) {
    if (arguments.length === 1) {
      g = r.g;
      b = r.b;
      r = r.r;
    }
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d = max - min,
      s = (max === 0 ? 0 : d / max),
      v = Math.max(max, w) / 255;
    let h;

    switch (max) {
      case min: h = 0; break;
      case r: h = (g - b) + d * (g < b ? 6 : 0); h /= 6 * d; break;
      case g: h = (b - r) + d * 2; h /= 6 * d; break;
      case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return {
      h: h * 360.0,
      s: s * 100.0,
      v: v * 100.0,
    };
  }

  static HSVtoRGB(hue, saturation, value) {
    const h = hue / 360.0;
    const s = saturation / 100.0;
    const v = value / 100.0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    const w = Math.min(r, g, b);
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      w: Math.round(w * 255),
    };
  }

  static updateHomeKitColorFromHomeCenter(color) {
    const colors = color.split(',');
    const r = parseInt(colors[0]);
    const g = parseInt(colors[1]);
    const b = parseInt(colors[2]);
    const w = parseInt(colors[3]);
    const hsv = this.RGBtoHSV(r, g, b, w);
    return hsv;
  }
}
