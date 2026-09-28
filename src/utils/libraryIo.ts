import type {
  LadderSide,
  TerrainCategory,
  TerrainPiece,
} from '../types/terrain'

const CATEGORIES: TerrainCategory[] = [
  'total_cover',
  'partial_cover',
  'impassable',
  'special',
]

const SIDES: LadderSide[] = ['N', 'S', 'E', 'W']

export const LIBRARY_JSON_VERSION = 1

export interface LibraryFile {
  version: number
  library: TerrainPiece[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function parsePiece(raw: unknown): TerrainPiece | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id : null
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const footprint = isRecord(raw.footprint) ? raw.footprint : null
  const category = CATEGORIES.includes(raw.category as TerrainCategory)
    ? (raw.category as TerrainCategory)
    : null
  const color = typeof raw.color === 'string' ? raw.color : '#888888'
  if (!id || !name || !footprint || !category) return null

  const width = Math.max(0.5, num(footprint.width, 0))
  const depth = Math.max(0.5, num(footprint.depth, 0))
  if (!width || !depth) return null

  const maxCount =
    raw.maxCount === null || raw.maxCount === undefined
      ? null
      : Math.max(1, Math.round(num(raw.maxCount, 1)))

  const hasSecondFloor = Boolean(raw.hasSecondFloor)
  let secondFloor: TerrainPiece['secondFloor']
  if (hasSecondFloor && isRecord(raw.secondFloor)) {
    secondFloor = {
      width: Math.max(0.5, num(raw.secondFloor.width, width)),
      depth: Math.max(0.5, num(raw.secondFloor.depth, depth)),
      offsetX: num(raw.secondFloor.offsetX, 0),
      offsetY: num(raw.secondFloor.offsetY, 0),
    }
  }

  const hasLadder = Boolean(raw.hasLadder)
  let ladderPosition: TerrainPiece['ladderPosition']
  if (hasLadder && isRecord(raw.ladderPosition)) {
    const side = SIDES.includes(raw.ladderPosition.side as LadderSide)
      ? (raw.ladderPosition.side as LadderSide)
      : 'S'
    ladderPosition = {
      x: num(raw.ladderPosition.x, 0),
      y: num(raw.ladderPosition.y, 0),
      side,
    }
  }

  const piece: TerrainPiece = {
    id,
    name,
    footprint: { width, depth },
    category,
    maxCount,
    hasSecondFloor,
    hasLadder,
    color,
  }
  if (secondFloor) piece.secondFloor = secondFloor
  if (ladderPosition) piece.ladderPosition = ladderPosition
  if (typeof raw.derivedFrom === 'string') piece.derivedFrom = raw.derivedFrom
  return piece
}

export function serializeLibrary(library: TerrainPiece[]): string {
  const file: LibraryFile = {
    version: LIBRARY_JSON_VERSION,
    library,
  }
  return JSON.stringify(file, null, 2)
}

export function parseLibraryJson(text: string): {
  ok: true
  library: TerrainPiece[]
} | { ok: false; error: string } {
  try {
    const data: unknown = JSON.parse(text)
    let list: unknown[]
    if (Array.isArray(data)) {
      list = data
    } else if (isRecord(data) && Array.isArray(data.library)) {
      list = data.library
    } else {
      return { ok: false, error: 'JSON에 library 배열이 없습니다.' }
    }
    const library: TerrainPiece[] = []
    const seen = new Set<string>()
    for (const item of list) {
      const piece = parsePiece(item)
      if (!piece) continue
      if (seen.has(piece.id)) continue
      seen.add(piece.id)
      library.push(piece)
    }
    if (library.length === 0) {
      return { ok: false, error: '유효한 지형 항목이 없습니다.' }
    }
    return { ok: true, library }
  } catch {
    return { ok: false, error: 'JSON을 해석할 수 없습니다.' }
  }
}

export function mergeLibraries(
  current: TerrainPiece[],
  incoming: TerrainPiece[],
): TerrainPiece[] {
  const map = new Map(current.map((p) => [p.id, p]))
  for (const piece of incoming) {
    map.set(piece.id, piece)
  }
  return [...map.values()]
}
