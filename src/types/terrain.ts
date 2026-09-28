export type TerrainCategory =
  | 'total_cover'
  | 'partial_cover'
  | 'impassable'
  | 'special'

export type LadderSide = 'N' | 'S' | 'E' | 'W'

export interface SecondFloor {
  width: number
  depth: number
  offsetX: number
  offsetY: number
}

export interface LadderPosition {
  x: number
  y: number
  side: LadderSide
}

export interface TerrainPiece {
  id: string
  name: string
  footprint: { width: number; depth: number } // inches
  category: TerrainCategory
  maxCount: number | null
  hasSecondFloor: boolean
  secondFloor?: SecondFloor
  hasLadder: boolean
  ladderPosition?: LadderPosition
  color: string
  derivedFrom?: string
}

export interface PlacedPiece {
  instanceId: string
  pieceId: string
  /** Center of footprint in inches (map space) */
  x: number
  y: number
  /** Degrees; auto-place uses 0/90/180/270, free-rotate may be any */
  rotation: number
  locked?: boolean
}

export interface MapConfig {
  widthIn: number
  heightIn: number
  borderBufferIn: number
}

export type DeploymentAxis = 'NS' | 'EW'

export interface DeploymentZone {
  visible: boolean
  axis: DeploymentAxis
  depthIn: number
}

export interface AppUiFlags {
  showGrid: boolean
}
