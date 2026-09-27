import type {
  DeploymentZone,
  MapConfig,
  PlacedPiece,
  TerrainPiece,
} from '../types/terrain'
import {
  canPlace,
  getPieceDef,
  orthogonalSize,
  placedAabb,
  type Rect,
} from './geometry'

const ORTHO_ANGLES = [0, 90, 180, 270] as const

/** Footprint area in square inches. */
export function pieceArea(def: TerrainPiece): number {
  return def.footprint.width * def.footprint.depth
}

/** Medium+ threshold: longer side >= this (inches). */
export const MEDIUM_MIN_SIDE = 6

/** Large threshold for deployment-zone bias. */
export const LARGE_MIN_SIDE = 8

export function isMediumOrLarger(def: TerrainPiece): boolean {
  return Math.max(def.footprint.width, def.footprint.depth) >= MEDIUM_MIN_SIDE
}

export function isLarge(def: TerrainPiece): boolean {
  return Math.max(def.footprint.width, def.footprint.depth) >= LARGE_MIN_SIDE
}

/** Fraction of rect area overlapping left half of the map. */
export function leftOverlapFraction(rect: Rect, mapWidth: number): number {
  const mid = mapWidth / 2
  const left = Math.max(0, Math.min(rect.x + rect.width, mid) - rect.x)
  return rect.width <= 0 ? 0.5 : left / rect.width
}

export interface HalfCoverage {
  left: number
  right: number
  /** Relative imbalance |L-R| / max(L+R, eps); 0 = perfect. */
  imbalance: number
}

export function halfCoverage(
  pieces: PlacedPiece[],
  library: TerrainPiece[],
  map: MapConfig,
): HalfCoverage {
  let left = 0
  let right = 0
  for (const p of pieces) {
    const def = getPieceDef(library, p.pieceId)
    if (!def) continue
    const aabb = placedAabb(p, library)
    if (!aabb) continue
    const area = pieceArea(def)
    const lf = leftOverlapFraction(aabb, map.widthIn)
    left += area * lf
    right += area * (1 - lf)
  }
  const total = left + right
  const imbalance = total <= 0 ? 0 : Math.abs(left - right) / total
  return { left, right, imbalance }
}

/** Center band: within this fraction of half-diagonal from map center. */
export const CENTER_RADIUS_FRAC = 0.28

export function isInCenterBand(
  x: number,
  y: number,
  map: MapConfig,
  radiusFrac = CENTER_RADIUS_FRAC,
): boolean {
  const cx = map.widthIn / 2
  const cy = map.heightIn / 2
  const maxR =
    Math.hypot(map.widthIn / 2, map.heightIn / 2) * radiusFrac
  return Math.hypot(x - cx, y - cy) <= maxR
}

export function hasMediumInCenter(
  pieces: PlacedPiece[],
  library: TerrainPiece[],
  map: MapConfig,
): boolean {
  for (const p of pieces) {
    const def = getPieceDef(library, p.pieceId)
    if (!def || !isMediumOrLarger(def)) continue
    if (isInCenterBand(p.x, p.y, map)) return true
  }
  return false
}

/** True if piece center lies inside a deployment zone strip. */
export function isInDeploymentZone(
  x: number,
  y: number,
  map: MapConfig,
  dz: DeploymentZone | null,
): boolean {
  if (!dz || !dz.visible) return false
  if (dz.axis === 'NS') {
    return y <= dz.depthIn || y >= map.heightIn - dz.depthIn
  }
  return x <= dz.depthIn || x >= map.widthIn - dz.depthIn
}

export interface PlacementBias {
  /** Prefer sampling inside the center band. */
  preferCenter?: boolean
  /** Prefer left (true) or right (false) half; undefined = no preference. */
  preferLeftHalf?: boolean | null
  /** Reject / heavily skip large pieces landing in DZ. */
  avoidDeploymentForLarge?: boolean
  deployment?: DeploymentZone | null
}

/**
 * Sample a legal orthogonal placement with optional regional bias.
 * Rejection sampling: biased attempts first, then fall back to uniform.
 */
export function tryBiasedPlacement(
  pieceId: string,
  instanceId: string,
  others: PlacedPiece[],
  library: TerrainPiece[],
  map: MapConfig,
  bias: PlacementBias = {},
  maxAttempts = 120,
): PlacedPiece | null {
  const def = getPieceDef(library, pieceId)
  if (!def) return null

  const buf = map.borderBufferIn
  const large = isLarge(def)
  const biasedAttempts = Math.floor(maxAttempts * 0.7)

  for (let i = 0; i < maxAttempts; i++) {
    const useBias = i < biasedAttempts
    const rotation = ORTHO_ANGLES[Math.floor(Math.random() * 4)]
    const { width, depth } = orthogonalSize(
      def.footprint.width,
      def.footprint.depth,
      rotation,
    )
    const minX = buf + width / 2
    const maxX = map.widthIn - buf - width / 2
    const minY = buf + depth / 2
    const maxY = map.heightIn - buf - depth / 2
    if (minX > maxX || minY > maxY) return null

    let x: number
    let y: number

    if (useBias && bias.preferCenter) {
      const cx = map.widthIn / 2
      const cy = map.heightIn / 2
      const maxR =
        Math.hypot(map.widthIn / 2, map.heightIn / 2) * CENTER_RADIUS_FRAC
      const ang = Math.random() * Math.PI * 2
      const r = Math.random() * maxR
      x = Math.min(maxX, Math.max(minX, cx + Math.cos(ang) * r))
      y = Math.min(maxY, Math.max(minY, cy + Math.sin(ang) * r))
    } else if (useBias && bias.preferLeftHalf === true) {
      const halfMax = Math.min(maxX, map.widthIn / 2 - width / 2)
      if (halfMax < minX) {
        x = minX + Math.random() * (maxX - minX)
      } else {
        x = minX + Math.random() * (halfMax - minX)
      }
      y = minY + Math.random() * (maxY - minY)
    } else if (useBias && bias.preferLeftHalf === false) {
      const halfMin = Math.max(minX, map.widthIn / 2 + width / 2)
      if (halfMin > maxX) {
        x = minX + Math.random() * (maxX - minX)
      } else {
        x = halfMin + Math.random() * (maxX - halfMin)
      }
      y = minY + Math.random() * (maxY - minY)
    } else {
      x = minX + Math.random() * (maxX - minX)
      y = minY + Math.random() * (maxY - minY)
    }

    // Soft reject: large terrain in deployment zone (~80% skip while biased)
    if (
      useBias &&
      bias.avoidDeploymentForLarge &&
      large &&
      isInDeploymentZone(x, y, map, bias.deployment ?? null) &&
      Math.random() < 0.8
    ) {
      continue
    }

    const candidate: PlacedPiece = {
      instanceId,
      pieceId,
      x,
      y,
      rotation,
    }
    if (canPlace(candidate, others, library, map)) return candidate
  }
  return null
}

/** Max allowed |L-R| / (L+R). Spec default ±10% → imbalance 0.1 of total pair. */
export const IMBALANCE_THRESHOLD = 0.1

export function scoreLayout(
  pieces: PlacedPiece[],
  library: TerrainPiece[],
  map: MapConfig,
): number {
  const { imbalance } = halfCoverage(pieces, library, map)
  const centerOk = hasMediumInCenter(pieces, library, map)
  // Lower is better
  let score = imbalance
  if (!centerOk) score += 0.35
  return score
}
