import type {
  DeploymentZone,
  MapConfig,
  PlacedPiece,
  TerrainPiece,
} from '../types/terrain'
import {
  getPieceDef,
  intersectionArea,
  isLargePiece,
  isMediumOrLarger,
  placedAabb,
  pieceFootprintArea,
  tryRandomPlacement,
  type Rect,
} from './geometry'

/** Half-vs-half terrain area share must stay within this of 50/50. */
const COVERAGE_DEVIATION_MAX = 0.1
const LAYOUT_ATTEMPTS = 16
/** Center circle radius as a fraction of the shorter map side. */
const CENTER_RADIUS_FRAC = 0.22

export interface RandomizeResult {
  pieces: PlacedPiece[]
  failed: { instanceId: string; pieceId: string; name: string }[]
  balanced: boolean
  centerFilled: boolean
  skippedCenterRule: boolean
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function defOf(
  library: TerrainPiece[],
  piece: PlacedPiece,
): TerrainPiece | undefined {
  return getPieceDef(library, piece.pieceId)
}

function halfRects(map: MapConfig): { left: Rect; right: Rect } {
  return {
    left: { x: 0, y: 0, width: map.widthIn / 2, height: map.heightIn },
    right: {
      x: map.widthIn / 2,
      y: 0,
      width: map.widthIn / 2,
      height: map.heightIn,
    },
  }
}

export function halfCoverage(
  pieces: PlacedPiece[],
  library: TerrainPiece[],
  map: MapConfig,
): { left: number; right: number; total: number; deviation: number } {
  const { left: leftRect, right: rightRect } = halfRects(map)
  let left = 0
  let right = 0
  for (const p of pieces) {
    const aabb = placedAabb(p, library)
    if (!aabb) continue
    left += intersectionArea(aabb, leftRect)
    right += intersectionArea(aabb, rightRect)
  }
  const total = left + right
  const deviation = total <= 0 ? 0 : Math.abs(left - right) / total
  return { left, right, total, deviation }
}

function centerRadius(map: MapConfig): number {
  return Math.min(map.widthIn, map.heightIn) * CENTER_RADIUS_FRAC
}

function inCenter(piece: PlacedPiece, map: MapConfig): boolean {
  const cx = map.widthIn / 2
  const cy = map.heightIn / 2
  const dx = piece.x - cx
  const dy = piece.y - cy
  const r = centerRadius(map)
  return dx * dx + dy * dy <= r * r
}

function hasMediumInCenter(
  pieces: PlacedPiece[],
  library: TerrainPiece[],
  map: MapConfig,
): boolean {
  return pieces.some((p) => {
    const def = defOf(library, p)
    return def && isMediumOrLarger(def) && inCenter(p, map)
  })
}

function overlapsDeployment(
  piece: PlacedPiece,
  library: TerrainPiece[],
  map: MapConfig,
  deployment: DeploymentZone | undefined,
): boolean {
  if (!deployment?.visible) return false
  const aabb = placedAabb(piece, library)
  if (!aabb) return false
  const d = deployment.depthIn
  if (deployment.axis === 'NS') {
    return (
      aabb.y < d || aabb.y + aabb.height > map.heightIn - d
    )
  }
  return aabb.x < d || aabb.x + aabb.width > map.widthIn - d
}

function countLargeInDeployment(
  pieces: PlacedPiece[],
  library: TerrainPiece[],
  map: MapConfig,
  deployment: DeploymentZone | undefined,
): number {
  if (!deployment?.visible) return 0
  return pieces.filter((p) => {
    const def = defOf(library, p)
    return (
      def &&
      isLargePiece(def) &&
      overlapsDeployment(p, library, map, deployment)
    )
  }).length
}

function lighterHalfBounds(
  map: MapConfig,
  coverage: { left: number; right: number },
): { minX: number; maxX: number; minY: number; maxY: number } | undefined {
  const preferLeft = coverage.left <= coverage.right
  const mid = map.widthIn / 2
  const pad = 0.5
  if (preferLeft) {
    return { minX: 0, maxX: mid - pad, minY: 0, maxY: map.heightIn }
  }
  return { minX: mid + pad, maxX: map.widthIn, minY: 0, maxY: map.heightIn }
}

function centerBounds(map: MapConfig): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  const r = centerRadius(map)
  return {
    minX: map.widthIn / 2 - r,
    maxX: map.widthIn / 2 + r,
    minY: map.heightIn / 2 - r,
    maxY: map.heightIn / 2 + r,
  }
}

function placeOne(
  piece: PlacedPiece,
  placed: PlacedPiece[],
  library: TerrainPiece[],
  map: MapConfig,
  deployment: DeploymentZone | undefined,
  preferCenter: boolean,
  preferLighterHalf: boolean,
): PlacedPiece | null {
  const def = defOf(library, piece)
  if (!def) return null

  const rejectLargeInDz = (candidate: PlacedPiece) =>
    isLargePiece(def) &&
    overlapsDeployment(candidate, library, map, deployment)

  if (preferCenter) {
    const hit = tryRandomPlacement(piece.pieceId, piece.instanceId, placed, library, map, {
      maxAttempts: 80,
      centerBounds: centerBounds(map),
      reject: rejectLargeInDz,
    })
    if (hit) return { ...hit, locked: piece.locked }
  }

  if (preferLighterHalf) {
    const cov = halfCoverage(placed, library, map)
    const bounds = lighterHalfBounds(map, cov)
    const hit = tryRandomPlacement(piece.pieceId, piece.instanceId, placed, library, map, {
      maxAttempts: 70,
      centerBounds: bounds,
      reject: rejectLargeInDz,
    })
    if (hit) return { ...hit, locked: piece.locked }
  }

  const outsideDz = tryRandomPlacement(
    piece.pieceId,
    piece.instanceId,
    placed,
    library,
    map,
    { maxAttempts: 80, reject: rejectLargeInDz },
  )
  if (outsideDz) return { ...outsideDz, locked: piece.locked }

  const any = tryRandomPlacement(
    piece.pieceId,
    piece.instanceId,
    placed,
    library,
    map,
    40,
  )
  if (any) return { ...any, locked: piece.locked }
  return null
}

function attemptLayout(
  library: TerrainPiece[],
  map: MapConfig,
  existing: PlacedPiece[],
  deployment: DeploymentZone | undefined,
): RandomizeResult {
  const locked = existing.filter((p) => p.locked)
  const unlocked = existing.filter((p) => !p.locked)
  const placed: PlacedPiece[] = [...locked]
  const failed: RandomizeResult['failed'] = []

  const needsCenter =
    !hasMediumInCenter(locked, library, map) &&
    unlocked.some((p) => {
      const def = defOf(library, p)
      return def && isMediumOrLarger(def)
    })
  const skippedCenterRule =
    !hasMediumInCenter(locked, library, map) &&
    !unlocked.some((p) => {
      const def = defOf(library, p)
      return def && isMediumOrLarger(def)
    })

  let centerPieceId: string | null = null
  if (needsCenter) {
    const mediums = unlocked.filter((p) => {
      const def = defOf(library, p)
      return def && isMediumOrLarger(def)
    })
    mediums.sort((a, b) => {
      const da = defOf(library, a)
      const db = defOf(library, b)
      return (db ? pieceFootprintArea(db) : 0) - (da ? pieceFootprintArea(da) : 0)
    })
    centerPieceId = mediums[0]?.instanceId ?? null
  }

  const rest = shuffle(unlocked.filter((p) => p.instanceId !== centerPieceId))
  rest.sort((a, b) => {
    const da = defOf(library, a)
    const db = defOf(library, b)
    return (db ? pieceFootprintArea(db) : 0) - (da ? pieceFootprintArea(da) : 0)
  })

  const queue = [
    ...(centerPieceId
      ? [unlocked.find((p) => p.instanceId === centerPieceId)!]
      : []),
    ...rest,
  ]

  for (const piece of queue) {
    const preferCenter = piece.instanceId === centerPieceId
    const result = placeOne(
      piece,
      placed,
      library,
      map,
      deployment,
      preferCenter,
      !preferCenter,
    )
    if (result) {
      placed.push(result)
    } else {
      placed.push(piece)
      failed.push({
        instanceId: piece.instanceId,
        pieceId: piece.pieceId,
        name: defOf(library, piece)?.name ?? piece.pieceId,
      })
    }
  }

  const { deviation } = halfCoverage(placed, library, map)
  return {
    pieces: placed,
    failed,
    balanced: deviation <= COVERAGE_DEVIATION_MAX,
    centerFilled: skippedCenterRule
      ? true
      : hasMediumInCenter(placed, library, map),
    skippedCenterRule,
  }
}

function score(result: RandomizeResult, library: TerrainPiece[], map: MapConfig, deployment: DeploymentZone | undefined): number {
  const { deviation } = halfCoverage(result.pieces, library, map)
  const largeDz = countLargeInDeployment(
    result.pieces,
    library,
    map,
    deployment,
  )
  return (
    deviation * 12 +
    (result.centerFilled ? 0 : 6) +
    largeDz * 0.8 +
    result.failed.length * 2
  )
}

/**
 * Re-place unlocked pieces already on the map, biasing toward even
 * left/right coverage, a medium+ piece near center, and fewer large
 * pieces in the deployment zone.
 */
export function randomizeLayout(
  library: TerrainPiece[],
  map: MapConfig,
  existing: PlacedPiece[],
  deployment?: DeploymentZone,
): RandomizeResult {
  let best: RandomizeResult | null = null
  let bestScore = Infinity

  for (let i = 0; i < LAYOUT_ATTEMPTS; i++) {
    const result = attemptLayout(library, map, existing, deployment)
    const s = score(result, library, map, deployment)
    if (
      result.balanced &&
      result.centerFilled &&
      result.failed.length === 0
    ) {
      if (s < bestScore) {
        best = result
        bestScore = s
      }
      // Good enough — stop early
      if (deviationOf(result, library, map) <= COVERAGE_DEVIATION_MAX * 0.6) {
        return result
      }
    } else if (s < bestScore) {
      best = result
      bestScore = s
    }
  }

  return best ?? attemptLayout(library, map, existing, deployment)
}

function deviationOf(
  result: RandomizeResult,
  library: TerrainPiece[],
  map: MapConfig,
): number {
  return halfCoverage(result.pieces, library, map).deviation
}
