import type { MapConfig, PlacedPiece, TerrainPiece } from '../types/terrain'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Snap to nearest 90° (0/90/180/270). */
export function snapRotation90(deg: number): 0 | 90 | 180 | 270 {
  const n = ((Math.round(deg / 90) % 4) + 4) % 4
  return (n * 90) as 0 | 90 | 180 | 270
}

/** Axis-aligned size after orthogonal rotation (swap on 90/270). */
export function orthogonalSize(
  width: number,
  depth: number,
  rotationDeg: number,
): { width: number; depth: number } {
  const r = ((Math.round(rotationDeg) % 360) + 360) % 360
  if (r === 90 || r === 270) return { width: depth, depth: width }
  return { width, depth }
}

/** AABB of a piece centered at (cx, cy). Uses orthogonal footprint for 90° snaps;
 * for free angles uses the axis-aligned bounding box of the rotated rectangle. */
export function pieceAabb(
  cx: number,
  cy: number,
  footprintW: number,
  footprintD: number,
  rotationDeg: number,
): Rect {
  const r = ((rotationDeg % 360) + 360) % 360
  const isOrtho = r % 90 === 0
  if (isOrtho) {
    const { width, depth } = orthogonalSize(footprintW, footprintD, r)
    return {
      x: cx - width / 2,
      y: cy - depth / 2,
      width,
      height: depth,
    }
  }
  const rad = (r * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const width = footprintW * cos + footprintD * sin
  const height = footprintW * sin + footprintD * cos
  return {
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
  }
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

export function rectInsidePlayable(rect: Rect, map: MapConfig): boolean {
  const buf = map.borderBufferIn
  return (
    rect.x >= buf &&
    rect.y >= buf &&
    rect.x + rect.width <= map.widthIn - buf &&
    rect.y + rect.height <= map.heightIn - buf
  )
}

export function getPieceDef(
  library: TerrainPiece[],
  pieceId: string,
): TerrainPiece | undefined {
  return library.find((p) => p.id === pieceId)
}

export function placedAabb(
  piece: PlacedPiece,
  library: TerrainPiece[],
): Rect | null {
  const def = getPieceDef(library, piece.pieceId)
  if (!def) return null
  return pieceAabb(
    piece.x,
    piece.y,
    def.footprint.width,
    def.footprint.depth,
    piece.rotation,
  )
}

/** Point-in-OBB test using local footprint axes. */
export function pointHitsPiece(
  xIn: number,
  yIn: number,
  piece: PlacedPiece,
  def: TerrainPiece,
): boolean {
  const rad = (-piece.rotation * Math.PI) / 180
  const dx = xIn - piece.x
  const dy = yIn - piece.y
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad)
  const hw = def.footprint.width / 2
  const hd = def.footprint.depth / 2
  return lx >= -hw && lx <= hw && ly >= -hd && ly <= hd
}

export function canPlace(
  candidate: PlacedPiece,
  others: PlacedPiece[],
  library: TerrainPiece[],
  map: MapConfig,
): boolean {
  const aabb = placedAabb(candidate, library)
  if (!aabb) return false
  if (!rectInsidePlayable(aabb, map)) return false
  for (const other of others) {
    if (other.instanceId === candidate.instanceId) continue
    const otherAabb = placedAabb(other, library)
    if (otherAabb && rectsOverlap(aabb, otherAabb)) return false
  }
  return true
}

const ORTHO_ANGLES = [0, 90, 180, 270] as const

export function pieceFootprintArea(def: TerrainPiece): number {
  return def.footprint.width * def.footprint.depth
}

export function longestSide(def: TerrainPiece): number {
  return Math.max(def.footprint.width, def.footprint.depth)
}

/** Medium+ used for the “center must not be empty” rule. */
export function isMediumOrLarger(def: TerrainPiece): boolean {
  return longestSide(def) >= 6 || pieceFootprintArea(def) >= 24
}

/** Large pieces get lower weight near deployment zones. */
export function isLargePiece(def: TerrainPiece): boolean {
  return longestSide(def) >= 8 || pieceFootprintArea(def) >= 48
}

export function intersectionArea(a: Rect, b: Rect): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const y = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  )
  return x * y
}

export interface PlacementOptions {
  maxAttempts?: number
  /** Extra clamp on piece center (inches) */
  centerBounds?: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  reject?: (candidate: PlacedPiece) => boolean
}

export function tryRandomPlacement(
  pieceId: string,
  instanceId: string,
  others: PlacedPiece[],
  library: TerrainPiece[],
  map: MapConfig,
  maxAttemptsOrOptions: number | PlacementOptions = 100,
): PlacedPiece | null {
  const options: PlacementOptions =
    typeof maxAttemptsOrOptions === 'number'
      ? { maxAttempts: maxAttemptsOrOptions }
      : maxAttemptsOrOptions
  const maxAttempts = options.maxAttempts ?? 100

  const def = getPieceDef(library, pieceId)
  if (!def) return null

  const buf = map.borderBufferIn
  for (let i = 0; i < maxAttempts; i++) {
    const rotation = ORTHO_ANGLES[Math.floor(Math.random() * 4)]
    const { width, depth } = orthogonalSize(
      def.footprint.width,
      def.footprint.depth,
      rotation,
    )
    let minX = buf + width / 2
    let maxX = map.widthIn - buf - width / 2
    let minY = buf + depth / 2
    let maxY = map.heightIn - buf - depth / 2
    if (options.centerBounds) {
      minX = Math.max(minX, options.centerBounds.minX)
      maxX = Math.min(maxX, options.centerBounds.maxX)
      minY = Math.max(minY, options.centerBounds.minY)
      maxY = Math.min(maxY, options.centerBounds.maxY)
    }
    if (minX > maxX || minY > maxY) return null

    const candidate: PlacedPiece = {
      instanceId,
      pieceId,
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
      rotation,
    }
    if (options.reject?.(candidate)) continue
    if (canPlace(candidate, others, library, map)) return candidate
  }
  return null
}

/** World-space position of the rotation handle (above local top edge). */
export function rotationHandlePos(
  piece: PlacedPiece,
  def: TerrainPiece,
  offsetIn = 1.2,
): { x: number; y: number } {
  const rad = (piece.rotation * Math.PI) / 180
  const dist = def.footprint.depth / 2 + offsetIn
  return {
    x: piece.x + dist * Math.sin(rad),
    y: piece.y - dist * Math.cos(rad),
  }
}
