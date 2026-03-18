export function isLightColor(hex: string): boolean {
  const rgb = hex.replace("#", "")
  const r = parseInt(rgb.substring(0, 2), 16) / 255
  const g = parseInt(rgb.substring(2, 4), 16) / 255
  const b = parseInt(rgb.substring(4, 6), 16) / 255
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return luminance > 0.5
}
