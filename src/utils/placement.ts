import type { MapConfig, PlacedPiece, TerrainPiece } from '../types/terrain'
import { tryRandomPlacement } from './geometry'

export interface RandomizeResult {
  pieces: PlacedPiece[]
  failed: { instanceId: string; pieceId: string; name: string }[]
}

/**
 * Re-place only pieces already on the map.
 * Locked pieces keep position/rotation; unlocked pieces get new random ortho poses.
 */
export function randomizeLayout(
  library: TerrainPiece[],
  map: MapConfig,
  existing: PlacedPiece[],
): RandomizeResult {
  const locked = existing.filter((p) => p.locked)
  const unlocked = existing.filter((p) => !p.locked)

  // Shuffle unlock order so placement isn't biased by add order
  const queue = [...unlocked]
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[queue[i], queue[j]] = [queue[j], queue[i]]
  }

  const placed: PlacedPiece[] = [...locked]
  const failed: RandomizeResult['failed'] = []

  for (const piece of queue) {
    const result = tryRandomPlacement(
      piece.pieceId,
      piece.instanceId,
      placed,
      library,
      map,
      100,
    )
    if (result) {
      placed.push({
        ...result,
        locked: piece.locked,
      })
    } else {
      // Keep original pose if we couldn't find a new spot
      placed.push(piece)
      const name =
        library.find((d) => d.id === piece.pieceId)?.name ?? piece.pieceId
      failed.push({
        instanceId: piece.instanceId,
        pieceId: piece.pieceId,
        name,
      })
    }
  }

  return { pieces: placed, failed }
}
