/** Pixels per inch for the top-down canvas. */
export const PX_PER_INCH = 12

export function inchesToPx(inches: number): number {
  return inches * PX_PER_INCH
}

export function pxToInches(px: number): number {
  return px / PX_PER_INCH
}

export { orthogonalSize as rotatedSize } from './geometry'
